#!/usr/bin/env python3
"""Independent numerical counterexamples/invariants added by the Oct 7 audit.

Stdlib only. These checks evaluate projections, distributions, and forward losses;
they do not treat source-string matches as mathematical verification.
"""
import math
import random
import unittest


def schedule(u, warmup, total, maximum, minimum):
    if not (0 <= warmup < total and 0 <= minimum <= maximum and u >= 0):
        raise ValueError("invalid schedule")
    if warmup and u < warmup:
        return maximum * u / warmup
    progress = min(1, (u - warmup) / (total - warmup))
    return minimum + (maximum - minimum) * (1 + math.cos(math.pi * progress)) / 2


def truncate(probabilities, k=None, threshold=None):
    order = sorted(range(len(probabilities)), key=lambda i: (-probabilities[i], i))
    if k is not None:
        order = order[:k]
    if threshold is not None:
        mass, kept = 0, []
        for i in order:
            kept.append(i)
            mass += probabilities[i]
            if mass >= threshold:
                break
        order = kept
    normalizer = sum(probabilities[i] for i in order)
    return [p / normalizer if i in order else 0 for i, p in enumerate(probabilities)]


class ComprehensiveMath(unittest.TestCase):
    def assertVector(self, actual, expected):
        self.assertEqual(len(actual), len(expected))
        for a, b in zip(actual, expected):
            self.assertAlmostEqual(a, b, places=11)

    def test_sft_probabilities_lengths_and_aggregation_weights(self):
        nll = [-math.log(p) for p in (.5, .4, .8)]
        self.assertAlmostEqual(sum(nll), 1.8325814637483102)
        self.assertAlmostEqual(sum(nll) / 3, .6108604879161034)
        short = -math.log(.25)
        self.assertAlmostEqual((sum(nll)/3 + short)/2, .998577424518)
        self.assertAlmostEqual((sum(nll) + short)/4, .804718956217)
        self.assertAlmostEqual((sum(nll) + short)/2, 1.609437912434)
        lengths, means = [2, 8], [1, 3]
        sequence_mean = sum(means)/2
        summed = sum(n*m for n,m in zip(lengths, means))/2
        token_mean = sum(n*m for n,m in zip(lengths, means))/sum(lengths)
        self.assertVector([sequence_mean, summed, token_mean], [2, 13, 2.6])
        self.assertAlmostEqual(summed, sum(lengths)/2 * token_mean)
        # Nonparallel per-token gradients: sequence mean and token mean cannot
        # generally be related by one scalar, let alone average sequence length.
        gradients = [(1, 0)]*2 + [(0, 1)]*8
        token_grad = [sum(g[j] for g in gradients)/10 for j in range(2)]
        seq_grad = [sum(g[j] for g in gradients[:2])/4 +
                    sum(g[j] for g in gradients[2:])/16 for j in range(2)]
        sum_grad = [sum(g[j] for g in gradients)/2 for j in range(2)]
        self.assertVector(token_grad, [.2, .8])
        self.assertVector(seq_grad, [.5, .5])
        self.assertVector(sum_grad, [5*g for g in token_grad])

    def test_pca_requires_top_eigenspace(self):
        points = [(2, 0), (-2, 0), (0, 1), (0, -1)]
        def error(v):
            return sum(sum((x[j] - sum(a*b for a, b in zip(x, v))*v[j])**2
                           for j in range(2)) for x in points)
        self.assertEqual(error((1, 0)), 2)
        self.assertEqual(error((0, 1)), 8)
        for i in range(101):
            angle = i * math.pi / 100
            v = (math.cos(angle), math.sin(angle))
            self.assertAlmostEqual(error(v), 10 - 4*(2*v[0]**2 + .5*v[1]**2))
            self.assertGreaterEqual(error(v) + 1e-12, 2)

    def test_central_difference_and_checkpoint(self):
        f = lambda x: x * abs(x)
        differences = [(f(e)-f(-e))/(2*e) for e in (.01, .001)]
        self.assertAlmostEqual(differences[0] / differences[1], 10)
        loss = lambda w: .5*((2*w)**2 - 20)**2
        derivative = lambda w: ((2*w)**2 - 20) * 8*w
        for w in (3, 2.616):
            numerical = (loss(w+1e-5)-loss(w-1e-5))/(2e-5)
            self.assertAlmostEqual(numerical, derivative(w), places=6)
        self.assertEqual(derivative(3), 384)
        self.assertNotAlmostEqual(derivative(2.616), 384)

    def test_schedule_endpoints_and_monotonicity(self):
        self.assertVector([schedule(u, 2, 10, .001, .0001) for u in (1,2,6,10)],
                          [.0005, .001, .00055, .0001])
        for warmup, total in ((0, 10), (1, 11), (20, 100)):
            values = [schedule(u, warmup, total, .1, .002) for u in range(total+1)]
            self.assertEqual(values[warmup], .1)
            self.assertEqual(values[-1], .002)
            self.assertTrue(all(a >= b for a, b in zip(values[warmup:], values[warmup+1:])))
            self.assertEqual(schedule(total+5, warmup, total, .1, .002), .002)
        with self.assertRaises(ValueError):
            schedule(1, 10, 10, 1, 0)

    def test_truncated_sampling_boundary_order_and_support(self):
        p = [.4, .3, .2, .1]
        self.assertVector(truncate(p, k=2), [4/7, 3/7, 0, 0])
        nucleus = truncate(p, threshold=.8)
        self.assertVector(nucleus, [4/9, 1/3, 2/9, 0])
        self.assertVector(truncate(p, threshold=.7), [4/7, 3/7, 0, 0])
        composed = truncate(truncate(p, k=2), threshold=.8)
        self.assertNotEqual(composed, nucleus)
        self.assertVector(truncate(p, threshold=1), p)
        self.assertVector(truncate([.5, .5], k=1), [1, 0])
        # Indicator of the excluded token: expectation cannot come from q's samples.
        self.assertGreater(p[-1], 0)
        self.assertEqual(nucleus[-1], 0)

    def test_position_bias_frequency_and_squared_scale(self):
        scores = [-.5*(2-j) for j in range(3)]
        weights = [math.exp(v) / sum(math.exp(x) for x in scores) for v in scores]
        self.assertVector(weights, [.18632372322584756, .3071958857184984, .506480391055654])
        s, alpha, beta = 4, 1, 32
        multipliers = []
        for turns in (alpha, (alpha+beta)/2, beta):
            ramp = min(1, max(0, (turns-alpha)/(beta-alpha)))
            multipliers.append((1-ramp)/s + ramp)
        self.assertVector(multipliers, [.25, .625, 1])
        a = 1 + .1*math.log(s)
        q, k = [1, 2], [2, -3]
        scaled_dot = sum((a*x)*(a*y) for x, y in zip(q, k))
        self.assertAlmostEqual(scaled_dot, a*a*sum(x*y for x, y in zip(q, k)))
        print(f"YaRN s=4: amplitude={a:.12f}, score factor={a*a:.12f}, score 2->{2*a*a:.12f}")

    def test_speculative_conservation_including_support_gaps(self):
        rng = random.Random(7)
        pairs = [([.5,.3,.2], [.2,.5,.3]), ([.3,.7], [0,1]), ([.4,.6], [.4,.6])]
        for _ in range(100):
            p, q = [rng.random() for _ in range(5)], [rng.random() for _ in range(5)]
            pairs.append(([x/sum(p) for x in p], [x/sum(q) for x in q]))
        for p, q in pairs:
            accepted = [y*min(1, x/y) if y else 0 for x, y in zip(p, q)]
            a = sum(accepted)
            residual_mass = [max(0, x-y) for x,y in zip(p,q)]
            self.assertAlmostEqual(sum(residual_mass), 1-a)
            self.assertAlmostEqual(a, 1-.5*sum(abs(x-y) for x,y in zip(p,q)))
            if a < 1-1e-12:
                residual = [x/sum(residual_mass) for x in residual_mass]
                self.assertVector([x+(1-a)*r for x,r in zip(accepted,residual)], p)
            else:
                self.assertVector(accepted, p)
        # Enumerate first-rejection/full-acceptance events independently of tail-sum.
        for a in (0, .2, .7, 1):
            k = 3
            expected = sum((j+1)*a**j*(1-a) for j in range(k)) + (k+1)*a**k
            self.assertAlmostEqual(expected, sum(a**j for j in range(k+1)))
        self.assertAlmostEqual(sum(.7**j for j in range(4))/1.3, 1.9484615384615385)

    def test_shared_parameters_require_both_paths(self):
        def forward(theta):
            h = 2*theta
            return sum(.5*(h+theta-target)**2 for target in (1,2))
        eps = 1e-5
        numeric = (forward(1+eps)-forward(1-eps))/(2*eps)
        self.assertAlmostEqual(numeric, 9)
        self.assertNotAlmostEqual(numeric, 6)  # prefix-only contribution


if __name__ == "__main__":
    unittest.main(verbosity=2)
