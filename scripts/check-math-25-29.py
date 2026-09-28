#!/usr/bin/env python3
"""Independent stdlib checks for the worked examples in chapters 25-29.

This intentionally does not parse lesson formulas or reuse their embedded code.
Finite differences freeze sampled weights/targets at the evaluation point where
the lesson specifies stop-gradient. No external training results are tested.
"""

import itertools
import math
import unittest


def derivative(function, point, step=1e-6):
    return (function(point + step) - function(point - step)) / (2 * step)


def sigmoid(value):
    if value >= 0:
        return 1 / (1 + math.exp(-value))
    exp_value = math.exp(value)
    return exp_value / (1 + exp_value)


def logit(probability):
    return math.log(probability / (1 - probability))


def softmax(values):
    shift = max(values)
    weights = [math.exp(value - shift) for value in values]
    total = math.fsum(weights)
    return [value / total for value in weights]


def entropy(probabilities):
    return -math.fsum(p * math.log(p) for p in probabilities if p > 0)


def discounted(rewards, gamma, bootstrap=0.0):
    value = bootstrap
    for reward in reversed(rewards):
        value = reward + gamma * value
    return value


def posterior(prior, transition, likelihood):
    predicted = [
        math.fsum(prior[i] * transition[i][j] for i in range(len(prior)))
        for j in range(len(prior))
    ]
    unnormalized = [p * z for p, z in zip(predicted, likelihood)]
    evidence = math.fsum(unnormalized)
    if evidence <= 0:
        raise ValueError("observation has zero probability")
    return [value / evidence for value in unnormalized], evidence


def ess(log_weights):
    if not log_weights or not all(math.isfinite(x) for x in log_weights):
        raise ValueError("finite nonempty log weights required")
    shift = max(log_weights)
    weights = [math.exp(x - shift) for x in log_weights]
    return math.fsum(weights) ** 2 / math.fsum(w * w for w in weights)


def ppo_term(ratio, advantage, epsilon=0.2):
    clipped = max(1 - epsilon, min(1 + epsilon, ratio))
    return min(ratio * advantage, clipped * advantage)


def neighbor_baseline(returns, similarities, temperature):
    if temperature <= 0 or not returns or len(returns) != len(similarities):
        raise ValueError("positive temperature and aligned candidates required")
    if not all(math.isfinite(x) for x in [*returns, *similarities]):
        raise ValueError("finite candidates required")
    weights = softmax([s / temperature for s in similarities])
    return math.fsum(w * r for w, r in zip(weights, returns)), weights


def wilson(successes, total, z=1.96):
    if total <= 0 or not 0 <= successes <= total:
        raise ValueError("valid binomial counts required")
    p = successes / total
    denominator = 1 + z * z / total
    center = (p + z * z / (2 * total)) / denominator
    half = z * math.sqrt(p * (1 - p) / total + z * z / (4 * total**2))
    return center - half / denominator, center + half / denominator


class MathCase(unittest.TestCase):
    def close(self, actual, expected, tolerance=1e-8):
        self.assertTrue(
            math.isclose(actual, expected, rel_tol=tolerance, abs_tol=tolerance),
            f"{actual!r} != {expected!r}",
        )


class Chapter25(MathCase):
    def test_belief_bayes_and_zero_evidence(self):
        prior = [0.6, 0.4]
        transition = [[0.8, 0.2], [0.1, 0.9]]
        positive, evidence = posterior(prior, transition, [0.9, 0.2])
        self.close(evidence, 0.564)
        self.close(positive[0], 39 / 47)
        self.close(positive[1], 8 / 47)
        self.close(sum(positive), 1)
        negative, _ = posterior(prior, transition, [0.1, 0.8])
        self.close(negative[0], 13 / 109)
        uninformative, _ = posterior(prior, transition, [0.5, 0.5])
        self.close(uninformative[0], 0.52)
        with self.assertRaises(ValueError):
            posterior(prior, transition, [0, 0])

    def test_masked_likelihood_and_finite_difference(self):
        roles = ["user", "assistant", "assistant", "tool", "assistant"]
        mask = [int(role == "assistant") for role in roles]
        self.assertEqual(mask, [0, 1, 1, 0, 1])
        probabilities = [0.9, 0.5, 0.25, 0.01, 0.8]
        logits = [logit(p) for p in probabilities]

        def loss(values):
            return -math.fsum(
                m * math.log(sigmoid(z)) for m, z in zip(mask, values)
            ) / sum(mask)

        self.close(loss(logits), math.log(10) / 3)
        self.close(math.prod(p for p, m in zip(probabilities, mask) if m), 0.1)
        expected = [0, -1 / 6, -1 / 4, 0, -1 / 15]
        for index, target in enumerate(expected):
            def coordinate(value):
                changed = logits.copy()
                changed[index] = value
                return loss(changed)

            self.close(derivative(coordinate, logits[index]), target)
        self.close(0.1 + 0.2, 0.3)
        self.close(0.1 / 0.3, 1 / 3)

    def test_smdp_time_and_truncation(self):
        gamma = 0.9
        next_value = -0.1 + gamma**3
        recursive = -0.1 + gamma**2 * next_value
        timestamped = -0.1 - 0.1 * gamma**2 + gamma**5
        self.close(next_value, 0.629)
        self.close(recursive, 0.40949)
        self.close(recursive, timestamped)
        self.close(discounted([-0.1, -0.1, 1], gamma), 0.62)
        self.assertNotAlmostEqual(recursive, -0.1)
        self.close(-0.1 + gamma**2 * next_value, recursive)
        self.close(math.exp(-(-math.log(gamma)) * 5), gamma**5)


class Chapter26(MathCase):
    def test_shaping_telescope_and_terminal_reversal(self):
        rewards = [-0.1, -0.1, 1]
        phi = [0.2, 0.5, 0.8, 0]
        gamma = 0.9
        shaping = [gamma * phi[i + 1] - phi[i] for i in range(3)]
        for actual, expected in zip(shaping, [0.25, 0.22, -0.8]):
            self.close(actual, expected)
        shaped = [r + f for r, f in zip(rewards, shaping)]
        self.close(discounted(shaped, gamma), 0.42)
        self.close(discounted(shaped, gamma), discounted(rewards, gamma) - phi[0])
        phi[-1] = 1
        residual = [
            rewards[i] + gamma * phi[i + 1] - phi[i] for i in range(3)
        ]
        self.close(discounted(residual, gamma), 1.149)
        self.assertGreater(0 + gamma * 2, 1 + gamma * 0)
        for gamma in [0, 0.5, 0.9, 1]:
            for terminal in [0, 1]:
                phi = [0.2, 0.5, 0.8, terminal]
                shaped = [
                    rewards[i] + gamma * phi[i + 1] - phi[i] for i in range(3)
                ]
                self.close(
                    discounted(shaped, gamma) - discounted(rewards, gamma),
                    -phi[0] + gamma**3 * phi[-1],
                )

    def test_shaping_bootstrap_and_smdp(self):
        self.close(discounted([-0.1, -0.1], 0.9, bootstrap=1), 0.62)
        self.close(discounted([0.15, 0.12], 0.9, bootstrap=1 - 0.8), 0.42)
        gamma, durations, phi = 0.9, [2, 3], [0.2, 0.5, 0]
        shaped = [
            -0.1 + gamma**durations[i] * phi[i + 1] - phi[i]
            for i in range(2)
        ]
        shaped_total = shaped[0] + gamma**2 * shaped[1] + gamma**5
        self.close(shaped_total, 0.40949 - 0.2)

    def test_entropy_gradient_and_information(self):
        h = entropy([0.8, 0.2])
        self.close(h, 0.5004024235381879)
        self.close(math.log(2) - h, 0.19274475702175742)
        z = logit(0.8)
        binary = lambda x: entropy([sigmoid(x), 1 - sigmoid(x)])
        analytic = 0.8 * 0.2 * math.log(0.2 / 0.8)
        self.close(derivative(binary, z), analytic)
        self.close(analytic, -0.2218070977791825)
        self.close(derivative(binary, 0), 0)
        logits = [math.log(0.2), math.log(0.3), math.log(0.5)]
        p = softmax(logits)
        gradient = [-value * (math.log(value) + entropy(p)) for value in p]
        self.close(sum(gradient), 0)
        for index, target in enumerate(gradient):
            def coordinate(value):
                changed = logits.copy()
                changed[index] = value
                return entropy(softmax(changed))

            self.close(derivative(coordinate, logits[index]), target)
        self.close((-3) - (-2), -1)

    def test_reward_noise_bias_variance_and_calibration(self):
        p, false_positive, false_negative = 0.5, 0.2, 0.1
        observed = lambda z: false_positive + (
            1 - false_positive - false_negative
        ) * sigmoid(z)
        self.close(derivative(sigmoid, 0), 0.25)
        self.close(derivative(observed, 0), 0.175)
        for p in [0, 0.2, 0.5, 1]:
            expected_judge = false_positive + 0.7 * p
            self.close((expected_judge - false_positive) / 0.7, p)
        noise_mean = sum(0.5 * noise for noise in [-1, 1])
        bias = sum(0.5 * noise * (action - 0.5)
                   for action, noise in [(0, -1), (1, 1)])
        self.close(noise_mean, 0)
        self.close(bias, 0.5)
        true_samples = [a * (a - 0.5) for a in [0, 1]]
        noisy_samples = [(a + e) * (a - 0.5)
                         for a in [0, 1] for e in [-0.2, 0.2]]
        variance = lambda xs: sum(x * x for x in xs) / len(xs) - (
            sum(xs) / len(xs)
        ) ** 2
        self.close(variance(noisy_samples) - variance(true_samples), 0.01)
        self.close((1 - 0.6 - 0.4) * 0.25, 0)
        self.assertLess((1 - 0.7 - 0.5) * 0.25, 0)

    def test_suffix_is_enumeration_clipping_and_support(self):
        weights, weighted_return, clipped_return, last_only = [], 0, 0, 0
        for first, second in [(1, 1), (1, 0), (0, 1), (0, 0)]:
            new_probability = (0.8 if first else 0.2) * (
                0.75 if second else 0.25
            )
            weight = new_probability / 0.25
            reward = first * second
            weights.append(weight)
            weighted_return += 0.25 * weight * reward
            clipped_return += 0.25 * min(weight, 2) * reward
            last_only += 0.25 * (1.5 if second else 0.5) * reward
        for actual, expected in zip(weights, [2.4, 0.8, 0.6, 0.2]):
            self.close(actual, expected)
        self.close(sum(weights) / 4, 1)
        self.close(sum(w * w for w in weights) / 4, 1.7)
        self.close(weighted_return, 0.6)
        self.close(clipped_return, 0.5)
        self.close(last_only, 0.375)
        self.close(ess([math.log(w) for w in weights]), 40 / 17)
        self.close(math.prod([]), 1)
        old_support = {(0, 0), (0, 1)}
        target_support = set(itertools.product([0, 1], repeat=2))
        self.assertFalse(target_support <= old_support)


class Chapter27(MathCase):
    def test_episode_step_credit_and_singleton(self):
        episode = [1, 0, 0]
        suffix = [1, 0.6, 0]
        mean_episode, mean_suffix = sum(episode) / 3, sum(suffix) / 3
        combined = [
            r - mean_episode + 0.5 * (g - mean_suffix)
            for r, g in zip(episode, suffix)
        ]
        for actual, expected in zip(combined, [0.9, -0.3, -0.6]):
            self.close(actual, expected)
        self.close(sum(combined), 0)
        self.close(0.6 - sum([0.6]) / len([0.6]), 0)
        self.close((0.9 + 0.1) / 2, 0.5)
        self.close(0.9 - 0.5, 0.4)

    def test_optimal_baseline_gradient_variance(self):
        p = 0.8
        probability = lambda a: p if a else 1 - p
        score = lambda a: a - p
        numerator = sum(probability(a) * a * score(a)**2 for a in [0, 1])
        denominator = sum(probability(a) * score(a)**2 for a in [0, 1])
        self.close(numerator / denominator, 0.2)
        for baseline, expected_variance in [(0, 0.0064), (0.2, 0), (0.8, 0.0576)]:
            mean = sum(probability(a) * (a - baseline) * score(a) for a in [0, 1])
            second = sum(probability(a) * ((a - baseline) * score(a))**2
                         for a in [0, 1])
            self.close(mean, 0.16)
            self.close(second - mean * mean, expected_variance)

    def test_self_baseline_and_loo_exact_expectations(self):
        p, size = 0.8, 2
        self_expected, loo_expected = 0, 0
        for actions in itertools.product([0, 1], repeat=size):
            probability = math.prod(p if a else 1 - p for a in actions)
            average = sum(actions) / size
            for index, action in enumerate(actions):
                score = action - p
                others = (sum(actions) - action) / (size - 1)
                self_expected += probability * score * (action - average) / size
                loo_expected += probability * score * (action - others) / size
        self.close(self_expected, 0.08)
        self.close(loo_expected, 0.16)

    def test_soft_neighbors_temperature_and_exclusion(self):
        returns = [1, 0.6, 0]
        similarities = [1, 1 - 0.2 * math.log(2), 1 - 0.2 * math.log(6)]
        baseline, weights = neighbor_baseline(returns, similarities, 0.2)
        self.close(baseline, 0.78)
        self.close(1 - baseline, 0.22)
        self.close(1 / sum(w * w for w in weights), 50 / 23)
        excluded = sum(w * r for w, r in zip(weights[1:], returns[1:])) / (
            1 - weights[0]
        )
        self.close(excluded, 0.45)
        self.close(1 - excluded, 0.55)
        mean_similarity = sum(w * s for w, s in zip(weights, similarities))
        covariance = sum(w * (r - baseline) * (s - mean_similarity)
                         for w, r, s in zip(weights, returns, similarities))
        numeric = derivative(
            lambda tau: neighbor_baseline(returns, similarities, tau)[0], 0.2
        )
        self.close(numeric, -covariance / 0.2**2)
        self.assertLess(numeric, 0)
        self.close(neighbor_baseline(returns, similarities, 1e-4)[0], 1)
        self.close(neighbor_baseline(returns, similarities, 1e8)[0], 8 / 15)
        tied, _ = neighbor_baseline([1, 0, 0], [1, 1, 0], 1e-4)
        self.close(tied, 0.5)
        for bad in [0, -1]:
            with self.assertRaises(ValueError):
                neighbor_baseline(returns, similarities, bad)
        with self.assertRaises(ValueError):
            neighbor_baseline([], [], 1)

    def test_exploration_coverage_and_zero_signal(self):
        p, size = 0.1, 4
        self.close(1 - (1 - p)**size, 0.3439)
        self.close(1 - p**size - (1 - p)**size, 0.3438)
        self.close(p**size + (1 - p)**size, 0.6562)
        required = math.ceil(math.log(0.05) / math.log(1 - p))
        self.assertEqual(required, 29)
        self.assertLess(1 - 0.9**28, 0.95)
        self.assertGreaterEqual(1 - 0.9**29, 0.95)
        self.assertEqual((required * 2000, required * 6), (58000, 174))
        for reward in [0, 1]:
            rewards = [reward] * size
            advantages = [r - sum(rewards) / size for r in rewards]
            self.assertEqual(advantages, [0] * size)
        correlated = [(0.9, [0] * size), (0.1, [1] * size)]
        self.close(sum(prob for prob, group in correlated if any(group)), 0.1)
        self.close(sum(prob for prob, group in correlated if min(group) != max(group)), 0)


class Chapter28(MathCase):
    def test_two_ratios_and_ppo_boundaries(self):
        rho, update, direct = 0.24 / 0.20, 0.30 / 0.24, 0.30 / 0.20
        self.close(rho, 1.2)
        self.close(update, 1.25)
        self.close(direct, rho * update)
        bilateral = lambda r: r if 0.8 <= r <= 1.25 else 0
        self.close(bilateral(rho) * ppo_term(update, 1), 1.44)
        self.close(bilateral(direct), 0)
        self.close(bilateral(0.8), 0.8)
        self.close(bilateral(1.25), 1.25)
        self.close(bilateral(0.8 - 1e-9), 0)
        self.close(bilateral(1.25 + 1e-9), 0)
        self.close(derivative(lambda r: ppo_term(r, 1), 1.25), 0)
        self.close(derivative(lambda r: ppo_term(r, -1), 0.7), 0)
        self.close(ppo_term(0.8, -1), -0.8)
        self.close(ppo_term(1.2, 1), 1.2)

    def test_detached_score_finite_difference(self):
        p, behavior = 0.3, 0.2
        z, frozen_ratio = logit(p), p / behavior
        detached_loss = lambda value: -frozen_ratio * math.log(sigmoid(value))
        attached_loss = lambda value: -sigmoid(value) / behavior * math.log(sigmoid(value))
        ratio_loss = lambda value: -sigmoid(value) / behavior
        self.close(derivative(detached_loss, z), -1.05)
        self.close(derivative(ratio_loss, z), -1.05)
        wrong = -frozen_ratio * (1 - p) * (1 + math.log(p))
        self.close(derivative(attached_loss, z), wrong)
        self.close(wrong, 0.21417144454223296)
        self.close(derivative(lambda _: -frozen_ratio, z), 0)

    def test_ess_scaling_freshness_and_valid_failure(self):
        logs = [0, 0, 0, math.log(9)]
        self.close(ess(logs), 12 / 7)
        self.close(ess([x + 1000 for x in logs]), 12 / 7)
        self.close(ess([0] * 4), 4)
        self.close(math.sqrt(ess(logs) / 4), math.sqrt(3 / 7))
        for invalid in [[], [math.inf], [math.nan]]:
            with self.assertRaises(ValueError):
                ess(invalid)
        self.assertGreater(12 - min([9, 11]), 2)
        self.assertLessEqual(12 - min([11, 12]), 2)
        self.assertEqual(math.prod([1, 1]) * math.prod([1, 1, 0]), 0)
        self.assertEqual(math.prod([1, 1]) * math.prod([1, 1, 1]), 1)

    def test_queue_units_capacity_and_selection(self):
        self.close(40 / 2, 20)
        self.close(min(32 / 8, 6000 / 1000, 3), 3)
        self.close(1 / (3 - 2), 1)
        self.close(1 / (3 - 2.8), 5)
        accepted = 2 * 0.9 * 0.75
        self.close(accepted, 1.35)
        self.close(accepted * 1000, 1350)
        self.close(accepted * 3 / 7, 0.5785714285714286)
        self.close(90 / (90 + 30), 0.75)
        self.close(2 + max(5, 3, 4), 7)
        self.close(2 + sum([5, 3, 4]), 14)

    def test_prefix_counts_and_shared_gradient(self):
        batch, prefix, suffix = 4, 100, 20
        naive, shared = batch * (prefix + suffix), prefix + batch * suffix
        self.assertEqual((naive, shared, naive - shared), (480, 180, 300))
        self.close((naive - shared) / naive, 0.625)
        for batch, prefix in [(1, 100), (4, 0)]:
            self.assertEqual(batch * (prefix + suffix), prefix + batch * suffix)

        def merged(theta):
            hidden = 2 * theta
            return sum(0.5 * (hidden - target)**2 for target in [1, 2])

        unmerged = lambda theta: 0.5 * (2 * theta - 1)**2 + 0.5 * (2 * theta - 2)**2
        self.close(merged(1), 0.5)
        self.close(merged(1), unmerged(1))
        self.close(derivative(merged, 1), 2)
        self.close(derivative(unmerged, 1), 2)
        self.close(derivative(lambda theta: merged(theta) / 2, 1), 1)


class Chapter29(MathCase):
    def test_end_to_end_training_loss(self):
        rewards = [-0.2, 0.9]
        returns = [sum(rewards[index:]) for index in range(2)]
        values = [0.3, 1.1]
        advantages = [g - v for g, v in zip(returns, values)]
        for actual, expected in zip(advantages, [0.4, -0.2]):
            self.close(actual, expected)
        actor = -sum(ppo_term(r, a) for r, a in zip([1.1, 0.7], advantages))
        critic = sum((g - v)**2 for g, v in zip(returns, values)) / (2 * len(values))
        total = actor + 0.5 * critic + 0.1 * 0.02 - 0.01 * 0.6
        self.close(actor, -0.28)
        self.close(critic, 0.05)
        self.close(total, -0.259)
        self.close(derivative(lambda r: -ppo_term(r, advantages[0]), 1.1), -0.4)
        self.close(derivative(lambda r: -ppo_term(r, advantages[1]), 0.7), 0)

    def test_lagrange_gradients_and_hard_budget_counterexample(self):
        objective = lambda lu, ln: 0.6 - lu * (12 - 10) - ln * (3000 - 4000)
        self.close(objective(0.02, 1e-5), 0.57)
        self.close(derivative(lambda lu: objective(lu, 1e-5), 0.02), -2)
        self.close(derivative(lambda ln: objective(0.02, ln), 1e-5, 1e-9), 1000)
        self.close(max(0, 0.02 + 0.005 * (12 - 10)), 0.03)
        self.close(max(0, 1e-5 + 1e-8 * (3000 - 4000)), 0)
        costs = [0, 20]
        self.assertLessEqual(sum(costs) / len(costs), 10)
        self.assertGreater(max(costs), 10)

    def test_aggregation_paired_interval_and_mcnemar(self):
        self.close((72 + 8) / 100, 0.8)
        self.close((72 / 80 + 8 / 20) / 2, 0.65)
        differences = [0] * 40 + [1] * 14 + [-1] * 8 + [0] * 38
        n = len(differences)
        mean = sum(differences) / n
        se = math.sqrt(sum((d - mean)**2 for d in differences) / (n * (n - 1)))
        self.close(mean, 0.06)
        self.close(se, 0.04675316658643119)
        self.close(mean - 1.96 * se, -0.03163620650940513)
        self.close(mean + 1.96 * se, 0.15163620650940512)
        exact_p = min(1, 2 * sum(math.comb(22, k) for k in range(9)) / 2**22)
        self.close(exact_p, 0.28627872467041016)
        self.assertGreater(exact_p, 0.05)

    def test_wilson_cost_and_holm_boundaries(self):
        lower, upper = wilson(54, 100)
        self.close(lower, 0.44264685393523856)
        self.close(upper, 0.6343935614666815)
        self.close(wilson(0, 100)[0], 0)
        self.assertGreater(wilson(0, 100)[1], 0)
        self.close(wilson(100, 100)[1], 1)
        self.assertLess(wilson(100, 100)[0], 1)
        with self.assertRaises(ValueError):
            wilson(0, 0)
        self.close(800 / 54, 14.814814814814815)
        self.close(1200 / 48, 25)
        p_values = [0.01, 0.04, 0.20]
        rejected = []
        for index, p_value in enumerate(p_values):
            if p_value > 0.05 / (len(p_values) - index):
                break
            rejected.append(index)
        self.assertEqual(rejected, [0])
        with self.assertRaises(ZeroDivisionError):
            _ = 100 / 0


if __name__ == "__main__":
    unittest.main(verbosity=2)
