#!/usr/bin/env python3
"""Execute the actual 09/19/27 lesson code and test its declared behavior.

Requires local PyTorch. Node imports the ES-module curriculum, avoiding regex
parsing of JavaScript strings. Full-model checks run on tiny CPU tensors.
"""
import json
import math
from pathlib import Path
import re
import subprocess
from types import SimpleNamespace
import unittest

import torch
from torch import nn


ROOT = Path(__file__).resolve().parents[1]
LESSONS = json.loads(subprocess.check_output(
    ["node", "--input-type=module", "-e",
     "import { CHAPTERS } from './content/catalog.js';"
     "console.log(JSON.stringify(Object.fromEntries(CHAPTERS.map(c =>"
     "[c.id,c.sections.find(s=>s.id==='code').body]))));"],
    cwd=ROOT, text=True))


def load_code(chapter, index=0):
    blocks = re.findall(r"~~~python\n([\s\S]*?)~~~", LESSONS[chapter])
    scope = {}
    exec(compile(blocks[index], f"chapter-{chapter}/code", "exec"), scope)
    return scope


C09, C19, C27 = load_code("09"), load_code("19"), load_code("27")
torch.set_num_threads(1)


def tiny_model():
    torch.manual_seed(19)
    def block():
        return SimpleNamespace(num_heads=2, norm1=nn.LayerNorm(8),
                               norm2=nn.LayerNorm(8), qkv=nn.Linear(8, 24),
                               wo=nn.Linear(8, 8),
                               ffn=nn.Sequential(nn.Linear(8, 12), nn.GELU(), nn.Linear(12, 8)))
    return SimpleNamespace(token_embedding=nn.Embedding(8, 8),
                           position_embedding=nn.Embedding(16, 8),
                           blocks=[block(), block()], final_norm=nn.LayerNorm(8),
                           lm_head=nn.Linear(8, 8))


class LessonCode(unittest.TestCase):
    def test_binary_padding_causal_batch_and_empty_queries(self):
        scores = torch.randn(3, 2, 4, 4, requires_grad=True)
        masks = torch.tensor([[1,1,0,0], [0,1,1,1], [0,0,0,0]], dtype=torch.bool)
        weights = C09["attention_weights"](scores, masks)
        self.assertEqual(weights.shape, scores.shape)
        self.assertTrue(torch.isfinite(weights).all())
        # Scalar reference enumerates valid keys, independent of broadcast implementation.
        for b in range(3):
            for h in range(2):
                for i in range(4):
                    allowed = [j for j in range(i+1) if masks[b,i] and masks[b,j]]
                    row = weights[b,h,i]
                    if not allowed:
                        self.assertEqual(row.abs().sum().item(), 0)
                    else:
                        expected = torch.zeros(4)
                        expected[allowed] = scores[b,h,i,allowed].softmax(-1).detach()
                        torch.testing.assert_close(row, expected)
        (weights*torch.randn_like(weights)).sum().backward()
        self.assertTrue(torch.isfinite(scores.grad).all())
        self.assertEqual(scores.grad[2].abs().sum().item(), 0)
        two = C09["attention_weights"](torch.zeros(1,1,2,2),
                                        torch.tensor([[True,False]]))
        torch.testing.assert_close(two[0,0,0], torch.tensor([1.,0.]))

    def test_complete_model_padding_positions_future_and_gradients(self):
        model = tiny_model()
        ids = torch.tensor([[1,2,3,0], [0,1,2,3], [0,0,0,0]])
        masks = torch.tensor([[1,1,1,0], [0,1,1,1], [0,0,0,0]])
        logits = C09["decoder_lm"](ids, masks, model)
        plain = C09["decoder_lm"](torch.tensor([[1,2,3]]), torch.ones(1,3), model)
        self.assertEqual(tuple(logits.shape), (3,4,8))
        self.assertTrue(torch.isfinite(logits).all())
        torch.testing.assert_close(logits[0,:3], plain[0], atol=1e-6, rtol=1e-5)
        torch.testing.assert_close(logits[1,1:], plain[0], atol=1e-6, rtol=1e-5)
        other = C09["decoder_lm"](torch.tensor([[1,2,7]]), torch.ones(1,3), model)
        torch.testing.assert_close(plain[:,:2], other[:,:2])  # no future leakage
        # Position parameters participate in real loss; no no-position fake forward.
        loss = C09["next_token_loss"](logits, ids, masks)
        loss.backward()
        self.assertGreater(model.position_embedding.weight.grad.abs().sum().item(), 0)
        self.assertTrue(torch.isfinite(model.position_embedding.weight.grad).all())
        with self.assertRaises(AssertionError):
            C09["decoder_lm"](ids, masks + 1, model)

    def test_exactly_one_shift_and_effective_label_mean(self):
        labels = torch.tensor([[1,2,3,4,0], [0,0,1,2,4]])
        mask = torch.tensor([[1,1,1,1,0], [0,0,1,1,1]])
        logits = torch.arange(50, dtype=torch.float32).reshape(2,5,5) / 7
        logits[1] = -logits[1]
        pairs = [(0,0,2), (0,1,3), (0,2,4), (1,2,2), (1,3,4)]
        def independent_mean(selected):
            total = 0
            for b,t,target in selected:
                row = logits[b,t].tolist()
                m = max(row)
                total += m + math.log(sum(math.exp(x-m) for x in row))-row[target]
            return total / len(selected)
        actual = C09["next_token_loss"](logits, labels, mask)
        self.assertAlmostEqual(actual.item(), independent_mean(pairs), places=6)
        labels[0,2] = -100
        self.assertAlmostEqual(C09["next_token_loss"](logits,labels,mask).item(),
                               independent_mean([p for p in pairs if p != (0,1,3)]), places=6)
        self.assertIsNone(C09["next_token_loss"](logits, labels, torch.zeros_like(mask)))

    def test_opsd_equal_sequence_weights_teacher_detach_and_padding(self):
        # KL(uniform || Bernoulli(q)) = c when 4q(1-q)=exp(-2c).
        targets = []
        for c in (1,3):
            q = (1-math.sqrt(1-math.exp(-2*c)))/2
            targets.append([math.log(q), math.log(1-q)])
        teacher = torch.tensor(targets)[:,None,:].repeat(1,8,1).requires_grad_()
        student = torch.zeros(2,8,2, requires_grad=True)
        mask = torch.tensor([[1,1,0,0,0,0,0,0], [1,1,1,1,1,1,1,1]])
        loss = C19["opsd_reverse_kl"](student, teacher, mask)
        self.assertAlmostEqual(loss.item(), 2, places=5)
        self.assertNotAlmostEqual(loss.item(), 2.6, places=3)
        loss.backward()
        self.assertIsNone(teacher.grad)
        self.assertTrue(torch.isfinite(student.grad).all())
        self.assertEqual(student.grad[0,2:].abs().sum().item(), 0)
        shifted = teacher.detach().clone()
        shifted[0,2:] = torch.tensor([100., -100.])
        torch.testing.assert_close(C19["opsd_reverse_kl"](student, shifted, mask), loss)
        with self.assertRaises(ValueError):
            C19["opsd_reverse_kl"](student, teacher, torch.zeros_like(mask))

    def test_soft_baseline_finite_contract_and_tiny_temperature(self):
        baseline = C27["soft_baseline"]
        value, weights = baseline([1,.6,0], [1, 1-.2*math.log(2), 1-.2*math.log(6)], .2)
        self.assertAlmostEqual(value, .78)
        for a,b in zip(weights, [.6,.3,.1]):
            self.assertAlmostEqual(a,b)
        for bad in (float("nan"), float("inf"), -float("inf"), 0, -1):
            with self.assertRaises(ValueError):
                baseline([1,0], [1,0], bad)
        for bad in (float("nan"), float("inf"), -float("inf")):
            for returns, similarities in (([bad,0],[1,0]), ([1,0],[bad,0])):
                with self.assertRaises(ValueError):
                    baseline(returns, similarities, .2)
        for returns, similarities in (([],[]), ([1],[1,0])):
            with self.assertRaises(ValueError):
                baseline(returns, similarities, .2)
        value, weights = baseline([1,.6,0], [1,1,-1], 5e-324)
        self.assertEqual(weights, [.5,.5,0])
        self.assertEqual(value, .8)


if __name__ == "__main__":
    unittest.main(verbosity=2)
