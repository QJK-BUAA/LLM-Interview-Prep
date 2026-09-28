#!/usr/bin/env python3
"""Independent stdlib checks for the worked examples in chapters 20--24."""

from fractions import Fraction
from itertools import combinations, product
from math import comb, exp, isclose, log, sqrt
import unittest


def close(actual, expected, tolerance=1e-7):
    if not isclose(actual, expected, rel_tol=tolerance, abs_tol=tolerance):
        raise AssertionError(f"{actual!r} != {expected!r}")


def derivative(function, x, h=1e-6):
    return (function(x + h) - function(x - h)) / (2 * h)


def gradient(function, vector):
    result = []
    for index, value in enumerate(vector):
        def vary(new_value):
            changed = list(vector)
            changed[index] = new_value
            return function(changed)
        result.append(derivative(vary, value))
    return result


def softmax(logits):
    weights = [exp(value - max(logits)) for value in logits]
    return [value / sum(weights) for value in weights]


def clip(value, low=0.8, high=1.2):
    return min(high, max(low, value))


def kl(first, second):
    return sum(p * log(p / q) for p, q in zip(first, second))


def pass_at_k(n, c, k):
    if any(type(value) is not int for value in (n, c, k)):
        raise ValueError("integer counts required")
    if not (n > 0 and 0 <= c <= n and 1 <= k <= n):
        raise ValueError("require n > 0, 0 <= c <= n, 1 <= k <= n")
    failures = comb(n - c, k) if n - c >= k else 0
    return 1 - Fraction(failures, comb(n, k))


def exact_mcnemar(b, c):
    if any(type(value) is not int or value < 0 for value in (b, c)):
        raise ValueError("nonnegative integer discordant counts required")
    total = b + c
    tail = Fraction(sum(comb(total, j) for j in range(min(b, c) + 1)),
                    2 ** total)
    return min(Fraction(1), 2 * tail)


def holm(p_values):
    if not p_values or any(not 0 <= value <= 1 for value in p_values):
        raise ValueError("nonempty list of valid probabilities required")
    ordered = sorted(range(len(p_values)), key=p_values.__getitem__)
    adjusted = [0] * len(p_values)
    running = 0
    for position, original_index in enumerate(ordered):
        running = max(running, (len(p_values) - position)
                      * p_values[original_index])
        adjusted[original_index] = min(1, running)
    return adjusted


class MathChecks(unittest.TestCase):
    def test_20_policy_derivatives(self):
        old = log(0.2)
        cases = [(1.5, 2, 0), (1.5, -2, -3),
                 (0.5, 2, 1), (0.5, -2, 0)]
        for ratio, advantage, expected in cases:
            logp = old + log(ratio)

            def ppo(value):
                r = exp(value - old)
                return min(r * advantage, clip(r) * advantage)

            close(derivative(ppo, logp), expected)
            # Freeze once: perturbing the weight would test a different loss.
            frozen_weight = clip(ratio)
            close(derivative(lambda value: frozen_weight * advantage * value,
                             logp), frozen_weight * advantage)
            tau = 2 if advantage > 0 else 3

            def sapo(value):
                r = exp(value - old)
                return advantage * 4 / tau / (1 + exp(-tau * (r - 1)))

            sigmoid = 1 / (1 + exp(-tau * (ratio - 1)))
            close(derivative(sapo, logp),
                  advantage * ratio * 4 * sigmoid * (1 - sigmoid))
        sigmoid = 1 / (1 + exp(-1))
        close(1.5 * 4 * sigmoid * (1 - sigmoid), 1.1796715994)

    def test_20_gspo_and_units(self):
        old = log(0.2)
        logps = [old + log(0.5), old + log(2)]

        def objective(values):
            ratio = exp(sum(value - old for value in values) / len(values))
            return min(ratio, clip(ratio))

        for value in gradient(objective, logps):
            close(value, 0.5)
        token_coefficients = [1] * 2 + [-0.5] * 6
        seq_coefficients = [1 / 4] * 2 + [-0.5 / 12] * 6
        close(derivative(lambda x: sum(c * x for c in seq_coefficients), 0),
              0.25)
        close(derivative(lambda x: sum(c * x for c in token_coefficients) / 8,
                         0), -0.125)
        close((0.1 / 2) / (1 / 8), 0.4)

    def test_20_gae_and_diagnostics(self):
        rewards, values = [0, 0, 1], [0.2, 0.3, 0.4, 0]
        residuals = [reward + values[i + 1] - values[i]
                     for i, reward in enumerate(rewards)]
        for i in range(3):
            close(values[i] + sum(residuals[i:]), sum(rewards[i:]))
        close(1 - 1 / (0.05 * 100), 0.8)
        close(1 - 1 / (0.05 * 1000), 0.98)
        self.assertLess(1 - 1 / (0.05 * 10), 0)
        weights = [1, 1, 1, 7]
        close(sum(weights) ** 2 / sum(w * w for w in weights), 25 / 13)
        close(log(2) ** 2, 0.4804530139)
        # Sum the covariance matrix instead of reusing the reduced formula.
        variance_of_mean = sum(1 if i == j else 0.2
                               for i in range(100) for j in range(100)) / 10000
        close(variance_of_mean, 0.208)

    def test_21_combinatorial_estimator_exhaustive(self):
        p = Fraction(1, 3)
        for n in range(1, 7):
            for k in range(1, n + 1):
                expected = Fraction(0)
                for outcomes in product((0, 1), repeat=n):
                    successes = sum(outcomes)
                    subsets = list(combinations(range(n), k))
                    empirical = Fraction(
                        sum(any(outcomes[i] for i in subset)
                            for subset in subsets), len(subsets))
                    self.assertEqual(empirical, pass_at_k(n, successes, k))
                    probability = p ** successes * (1 - p) ** (n - successes)
                    expected += probability * empirical
                self.assertEqual(expected, 1 - (1 - p) ** k)
        self.assertEqual(pass_at_k(8, 2, 2), Fraction(13, 28))
        self.assertEqual(pass_at_k(8, 2, 8), 1)
        self.assertEqual(pass_at_k(8, 0, 8), 0)
        self.assertEqual(1 - (1 - Fraction(2, 8)) ** 2, Fraction(7, 16))
        plugin = sum(Fraction(comb(2, c), 4)
                     * (1 - (1 - Fraction(c, 2)) ** 2) for c in range(3))
        self.assertEqual(plugin, Fraction(5, 8))
        for invalid in [(0, 0, 1), (8, 9, 2), (8, 2, 9), (8, True, 2)]:
            with self.assertRaises(ValueError):
                pass_at_k(*invalid)

    def test_21_dynamic_selection(self):
        acceptance = []
        for p in [Fraction(1, 10), Fraction(1, 2)]:
            # Independently enumerate all 16 group outcomes.
            mixed = sum(p ** sum(row) * (1 - p) ** (4 - sum(row))
                        for row in product((0, 1), repeat=4)
                        if 0 < sum(row) < 4)
            self.assertEqual(mixed, 1 - p ** 4 - (1 - p) ** 4)
            acceptance.append(mixed)
        close(acceptance[0], 0.3438)
        close(acceptance[1], 0.875)
        z = sum(acceptance) / 2
        close(z, 0.6094)
        selected = [a / (2 * z) for a in acceptance]
        close(selected[0], 0.2820807351)
        close(100 / z, 164.0958319659)
        close(400000 / z, 656383.3278634723)
        # A geometric waiting time yields the same mean as the NB argument.
        waiting = sum(k * float(z) * (1 - float(z)) ** (k - 1)
                      for k in range(1, 200))
        close(waiting * 100, 100 / z)
        for selected_weight, accept in zip(selected, acceptance):
            close(selected_weight * z / accept, 0.5)
        self.assertEqual(1 - 0 ** 4 - 1 ** 4, 0)
        self.assertEqual(1 - Fraction(1, 2) - Fraction(1, 2), 0)

    def test_21_weight_and_verifier(self):
        target, lengths = [0.5, 0.5], [1000, 4000]
        raw = [weight / length for weight, length in zip(target, lengths)]
        proposal = [value / sum(raw) for value in raw]
        close(proposal[0], 0.8)
        close(proposal[1], 0.2)
        close(proposal[0] * lengths[0], proposal[1] * lengths[1])
        # An explicit 1000-item confusion table verifies Bayes and noise rates.
        true_positive, false_negative, false_positive, true_negative = (
            190, 10, 80, 720)
        total = true_positive + false_negative + false_positive + true_negative
        observed = (true_positive + false_positive) / total
        close(observed, 0.27)
        close(true_positive / (true_positive + false_positive), 19 / 27)
        close((observed - 0.1) / (1 - 0.1 - 0.05), 0.2)
        close(derivative(lambda p: 0.1 * (1 - p) + 0.95 * p, 0.2), 0.85)
        proxy = [10.2, 2.8]
        reference = [10, 2]
        unnormalized = [0.5 * exp(max(p - r, 0))
                        for p, r in zip(proxy, reference)]
        close(unnormalized[0] / sum(unnormalized), 0.3543436938)

    def test_22_domain_loss_and_gradient(self):
        lengths, losses = [1000, 4000], [1, 3]
        close(sum(0.5 * loss for loss in losses), 2)
        close(sum(n * loss for n, loss in zip(lengths, losses))
              / sum(lengths), 2.6)
        close((0.5 / 1000) / (0.5 / 4000), 4)
        logits = [log(0.2), log(0.3), log(0.5)]
        for scale in [0.5 / 1000, 0.5 / 4000]:
            got = gradient(lambda z: -scale * log(softmax(z)[0]), logits)
            for value, expected in zip(got, [-0.8, 0.3, 0.5]):
                close(value, scale * expected, tolerance=1e-10)
        close(sum(w * r for w, r in zip([0.6, 0.3, 0.1], [0.8, 0.5, 0.9])),
              0.72)
        close(sum(w * r for w, r in zip([0.6, 0.3, 0.1], [0.8, 5, 0.9])),
              2.07)

    def test_22_distillation(self):
        teacher, student = [0.8, 0.2], [0.5, 0.5]
        close(kl(teacher, student), 0.1927447570)
        got = gradient(lambda z: kl(teacher, softmax(z)), [0, 0])
        for value, expected in zip(got, [-0.3, 0.3]):
            close(value, expected)
        hard = gradient(lambda z: -log(softmax(z)[0]), [0, 0])
        for value, expected in zip(hard, [-0.5, 0.5]):
            close(value, expected)
        candidates, verified = [0.6, 0.4], [1, 0]
        accepted = [p * v for p, v in zip(candidates, verified)]
        self.assertEqual([p / sum(accepted) for p in accepted], [1, 0])
        close(2 / sum(accepted), 10 / 3)

    def test_22_budget(self):
        kept, acceptance = 1_000_000, 0.25
        generated = kept / acceptance
        close(generated, 4_000_000)
        close(generated / 1000 * (1 + 0.2) + kept / 1000 * 2, 6800)
        close(kept / 1000 * (1 + 0.2 + 2), 3200)
        close(kept / 1000 * (1 + 0.5 + 2), 3500)
        self.assertEqual(3995 * 16 * 4096, 261_816_320)
        costs = [2_664_000, 119_000, 5_000]
        self.assertEqual(sum(costs), 2_788_000)
        close(100 * costs[-1] / sum(costs), 0.1793400287)
        close(100 * costs[-1] / costs[0], 0.1876876877)
        self.assertEqual(sum(costs) * 2, 5_576_000)

    def test_23_ratio_and_support(self):
        behavior, old_train, current = 0.2, 0.25, 0.30
        close(current / old_train, 1.2)
        close(old_train / behavior, 1.25)
        close((current / old_train) * (old_train / behavior), 1.5)
        close(min(current / behavior, 1.2) * 0.5, 0.6)
        mu, target = [0.6, 0.4, 0], [0.3, 0.3, 0.4]
        sampled_expectation = sum(q * p / q for q, p in zip(mu, target) if q)
        close(sampled_expectation, 0.6)
        conditional = [0.5, 0.5, 0]
        conditional_expectation = sum(q * p / q for q, p in zip(mu, conditional)
                                      if q)
        close(conditional_expectation, 1)

    def test_23_opd_gradient_and_clipping_bias(self):
        p, teacher = [0.4, 0.6], [0.8, 0.2]
        frozen_advantages = [log(t / student) for t, student in zip(teacher, p)]
        logits = [log(value) for value in p]
        expected_ascent = []
        for v in range(2):
            expected_ascent.append(sum(
                p[a] * frozen_advantages[a] * ((a == v) - p[v])
                for a in range(2)))
        close(expected_ascent[0], 0.4300222726)
        finite = gradient(lambda z: kl(softmax(z), teacher), logits)
        for descent, ascent in zip(finite, expected_ascent):
            close(descent, -ascent)
        mu = [0.5, 0.5]
        unclipped = sum(mu[a] * (p[a] / mu[a]) * frozen_advantages[a]
                        * ((a == 0) - p[0]) for a in range(2))
        clipped = sum(mu[a] * min(p[a] / mu[a], 1) * frozen_advantages[a]
                      * ((a == 0) - p[0]) for a in range(2))
        close(unclipped, expected_ascent[0])
        close(clipped, 0.3860777811)
        self.assertLess(clipped, unclipped)

    def test_23_critical_path_and_reuse(self):
        times, overhead = [4, 6, 3], 2
        predecessors = [[], [], [1]]
        finish = []
        for index, time in enumerate(times):
            finish.append(time + max((finish[p] for p in predecessors[index]),
                                     default=0))
        serial, parallel = sum(times) + overhead, max(finish) + overhead
        self.assertEqual((serial, parallel), (15, 11))
        close(serial / parallel, 15 / 11)
        close(serial / (max(times) + overhead), 1.875)
        close((3 * (1000 + 100)) / (1000 + 3 * 100), 33 / 13)
        self.assertEqual(2 * 5, 10)
        close(0.4 * 5, 2)

    def test_24_dpo_gradient(self):
        reference_margin = 0.2
        chosen, rejected = -1.0, -1.0 - reference_margin - log(2)

        def dpo(values):
            margin = values[0] - values[1] - reference_margin
            return log(1 + exp(-margin))

        close(dpo([chosen, rejected]), log(1.5))
        got = gradient(dpo, [chosen, rejected])
        for value, expected in zip(got, [-1 / 3, 1 / 3]):
            close(value, expected)
        forward = gradient(lambda z: kl([0.8, 0.2], softmax(z)),
                           [log(0.4), log(0.6)])
        for value, expected in zip(forward, [-0.4, 0.4]):
            close(value, expected)

    def test_24_paired_inference(self):
        pairs = [(1, 1)] * 53 + [(0, 0)] * 30 + [(1, 0)] * 7 + [(0, 1)] * 10
        differences = [b - a for a, b in pairs]
        n = len(differences)
        delta = sum(differences) / n
        close(delta, 0.03)
        sample_variance = sum((d - delta) ** 2 for d in differences) / (n - 1)
        close(sample_variance, 16.91 / 99)
        standard_error = sqrt(sample_variance / n)
        close(standard_error, 0.0413289343)
        close(delta - 1.96 * standard_error, -0.0510047112)
        close(delta + 1.96 * standard_error, 0.1110047112)
        self.assertEqual(sum(comb(17, j) for j in range(8)), 41226)
        close(exact_mcnemar(7, 10), 0.629058837890625)
        self.assertEqual(exact_mcnemar(0, 0), 1)
        self.assertEqual(exact_mcnemar(5, 5), 1)
        self.assertEqual(exact_mcnemar(0, 8), Fraction(1, 128))
        self.assertEqual(exact_mcnemar(7, 10), exact_mcnemar(10, 7))
        with self.assertRaises(ValueError):
            exact_mcnemar(-1, 2)

    def test_24_holm_and_budget(self):
        raw = [exact_mcnemar(0, 8), exact_mcnemar(2, 10), exact_mcnemar(7, 10)]
        for got, expected in zip(raw, [0.0078125, 0.03857421875, 0.62905883789]):
            close(got, expected)
        adjusted = holm(raw)
        for got, expected in zip(adjusted, [0.0234375, 0.0771484375,
                                           0.62905883789]):
            close(got, expected)
        self.assertEqual([value <= 0.05 for value in adjusted],
                         [True, False, False])
        self.assertEqual(holm(list(reversed(raw))), list(reversed(adjusted)))
        self.assertEqual(holm([0.03, 0.01, 0.04]), [0.06, 0.03, 0.06])
        self.assertEqual(holm([1, 1]), [1, 1])
        self.assertEqual((100 * 20000, 50 * 60000), (2_000_000, 3_000_000))
        close((35 - 20) / (0.63 - 0.60), 500)
        self.assertEqual((100 // 20, 100 // 35, 100 % 35), (5, 2, 30))


if __name__ == "__main__":
    unittest.main(verbosity=2)
