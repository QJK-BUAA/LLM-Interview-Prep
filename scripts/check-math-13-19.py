#!/usr/bin/env python3
"""Independent, deterministic stdlib checks for chapter 13--19 examples.

Run: python3 scripts/check-math-13-19.py
No model, network, third-party package, or curriculum-code import is needed.
Finite differences keep reference/old distributions and teacher targets fixed.
"""

import itertools
import math
import unittest


def dot(a, b):
    return sum(x * y for x, y in zip(a, b))


def softmax(logits, temperature=1.0):
    if temperature <= 0:
        raise ValueError("temperature must be positive")
    scaled = [x / temperature for x in logits]
    exps = [math.exp(x - max(scaled)) for x in scaled]
    return [x / sum(exps) for x in exps]


def sigmoid(x):
    return 1.0 / (1.0 + math.exp(-x)) if x >= 0 else math.exp(x) / (1 + math.exp(x))


def softplus(x):
    return max(x, 0.0) + math.log1p(math.exp(-abs(x)))


def kl(p, q):
    return sum(pi * math.log(pi / qi) for pi, qi in zip(p, q) if pi > 0)


def finite_difference(fn, values, step=1e-6):
    result = []
    for i in range(len(values)):
        left, right = list(values), list(values)
        left[i] -= step
        right[i] += step
        result.append((fn(right) - fn(left)) / (2 * step))
    return result


def solve_linear(matrix, rhs):
    """Small partial-pivoting solve, independent of Bellman iteration."""
    n = len(rhs)
    rows = [list(row) + [value] for row, value in zip(matrix, rhs)]
    for col in range(n):
        pivot = max(range(col, n), key=lambda i: abs(rows[i][col]))
        rows[col], rows[pivot] = rows[pivot], rows[col]
        if abs(rows[col][col]) < 1e-12:
            raise ValueError("singular system")
        scale = rows[col][col]
        rows[col] = [x / scale for x in rows[col]]
        for i in range(n):
            if i != col:
                scale = rows[i][col]
                rows[i] = [x - scale * y for x, y in zip(rows[i], rows[col])]
    return [row[-1] for row in rows]


def gae(rewards, values, terminated, boundaries, gamma, lam):
    residuals = [
        reward + gamma * (not done) * values[i + 1] - values[i]
        for i, (reward, done) in enumerate(zip(rewards, terminated))
    ]
    advantages = [0.0] * len(rewards)
    running = 0.0
    for i in reversed(range(len(rewards))):
        running = residuals[i] + gamma * lam * (not boundaries[i]) * running
        advantages[i] = running
    return residuals, advantages


def ppo_surrogate(logp, old_logp, advantage, lower=0.8, upper=1.2):
    ratio = math.exp(logp - old_logp)
    return min(ratio * advantage, min(max(ratio, lower), upper) * advantage)


def ppo_logp_gradient(ratio, advantage, lower=0.8, upper=1.2):
    clipped = (advantage > 0 and ratio > upper) or (advantage < 0 and ratio < lower)
    return 0.0 if clipped else ratio * advantage


def group_advantages(rewards, epsilon=0.0):
    if not rewards:
        raise ValueError("empty group")
    mean = sum(rewards) / len(rewards)
    centered = [r - mean for r in rewards]
    std = math.sqrt(sum(x * x for x in centered) / len(rewards))
    return [x / (std + epsilon) for x in centered] if std + epsilon else [0.0] * len(rewards)


def rloo(rewards):
    if len(rewards) < 2:
        raise ValueError("RLOO needs at least two independent samples")
    return [r - (sum(rewards) - r) / (len(rewards) - 1) for r in rewards]


class CurriculumMath(unittest.TestCase):
    def close(self, actual, expected, tolerance=2e-7):
        self.assertTrue(
            math.isclose(actual, expected, rel_tol=tolerance, abs_tol=tolerance),
            f"{actual:.12g} != {expected:.12g}",
        )

    def vector_close(self, actual, expected, tolerance=2e-7):
        self.assertEqual(len(actual), len(expected))
        for x, y in zip(actual, expected):
            self.close(x, y, tolerance)

    def test_13_bellman_matrix_contraction_control(self):
        gamma, rewards = 0.5, [1.0, 2.0]
        transition = [[0.0, 1.0], [1.0, 0.0]]
        matrix = [[float(i == j) - gamma * transition[i][j] for j in range(2)] for i in range(2)]
        solution = solve_linear(matrix, rewards)
        self.vector_close(solution, [8 / 3, 10 / 3])
        backup = lambda v: [r + gamma * dot(row, v) for r, row in zip(rewards, transition)]
        values = [0.0, 0.0]
        for step in range(60):
            updated = backup(values)
            error = max(abs(x - y) for x, y in zip(updated, solution))
            self.assertLessEqual(error, gamma ** (step + 1) * max(solution) + 1e-14)
            values = updated
        self.vector_close(values, solution)
        probe = [2.5, 3.0]
        residual = max(abs(x - y) for x, y in zip(probe, backup(probe)))
        error = max(abs(x - y) for x, y in zip(probe, solution))
        self.assertLessEqual(error, residual / (1 - gamma))
        for terminal_reward, expected in [(2.0, solution), (3.0, [3.0, 3.5])]:
            values = [0.0, 0.0]
            for _ in range(80):
                values = [max(terminal_reward, 1 + gamma * values[1]), 2 + gamma * values[0]]
            self.vector_close(values, expected)
        print("13 Bellman: v=[8/3,10/3]; improved v=[3,3.5]; residual bound PASS")

    def test_13_terminal_and_discount_boundaries(self):
        self.close(2 + 0.9 * 5, 6.5)
        self.close(2 + 0.9 * 0 * 5, 2)
        with self.assertRaises(ValueError):
            solve_linear([[0.0]], [1.0])
        self.vector_close(solve_linear([[1 - 0.5]], [1.0]), [2.0])
        self.close(0.02 / (1 - 0.9), 0.2)

    def test_14_dqn_double_dueling_huber(self):
        self.close(sum(max(pair) for pair in itertools.product([-1, 1], repeat=2)) / 4, 0.5)
        target, online = [2.0, 5.0], [4.0, 3.0]
        self.close(1 + 0.9 * max(target), 5.5)
        selected = max(range(2), key=lambda i: online[i])
        self.close(1 + 0.9 * target[selected], 2.8)
        self.close(finite_difference(lambda x: 0.5 * (2 * x[0] - 4.6) ** 2, [1.0])[0], -5.2)
        self.close(2 * (1 + 0.1 * 5.2), 3.04)
        advantages = [2, 0, -1]
        self.vector_close([3 + a - sum(advantages) / 3 for a in advantages], [14 / 3, 8 / 3, 5 / 3])
        huber = lambda x: 0.5 * x * x if abs(x) <= 1 else abs(x) - 0.5
        self.close(huber(-2.6), 2.1)
        self.close(finite_difference(lambda x: huber(x[0]), [-2.6])[0], -1)
        print("14 Double targets: DQN=5.5, Double=2.8; Huber loss=2.1, derivative=-1")

    def test_15_score_function_causality_discount(self):
        p, gamma = 0.3, 0.6
        full = causal = missing_discount = 0.0
        for a0, a1 in itertools.product([0, 1], repeat=2):
            probability = (p if a0 else 1 - p) * (p if a1 else 1 - p)
            r0, r1 = a0, a0 + a1
            total = r0 + gamma * r1
            full += probability * ((a0 - p) + (a1 - p)) * total
            causal += probability * ((a0 - p) * total + gamma * (a1 - p) * r1)
            missing_discount += probability * ((a0 - p) * total + (a1 - p) * r1)
        self.close(full, (1 + 2 * gamma) * p * (1 - p))
        self.close(causal, full)
        self.assertGreater(abs(missing_discount - full), 0.05)

    def test_15_baseline_optimum_and_counterexample(self):
        p = 0.8
        weights = [(1 - p, 0), (p, 1)]
        numerator = sum(w * (a - p) ** 2 * a for w, a in weights)
        denominator = sum(w * (a - p) ** 2 for w, a in weights)
        self.close(numerator / denominator, 0.2)
        for baseline, expected_variance in [(0.0, 0.0064), (0.2, 0.0), (0.8, 0.0576)]:
            mean = sum(w * (a - p) * (a - baseline) for w, a in weights)
            variance = sum(w * ((a - p) * (a - baseline) - mean) ** 2 for w, a in weights)
            self.close(mean, 0.16)
            self.close(variance, expected_variance)
        self.close(sum(0.5 * (a - 0.5) * (-a) for a in [0, 1]), -0.25)
        print("15 baseline: b*=0.2; variances b=0/0.2/0.8 -> 0.0064/0/0.0576")

    def test_15_gae_telescope_and_truncation(self):
        rewards, values = [0, 0, 1], [0.2, 0.3, 0.5, 0]
        terminal = [False, False, True]
        residuals, advantages = gae(rewards, values, terminal, terminal, 0.9, 0.8)
        self.vector_close(residuals, [0.07, 0.15, 0.5])
        self.vector_close(advantages, [0.4372, 0.51, 0.5])
        self.vector_close([a + v for a, v in zip(advantages, values)], [0.6372, 0.81, 1])
        for lam in [0.0, 0.8, 1.0]:
            _, actual = gae(rewards, values, terminal, terminal, 0.9, lam)
            for t in range(3):
                horizon = 3 - t
                nstep = [
                    sum(0.9 ** j * rewards[t + j] for j in range(n))
                    + 0.9 ** n * values[t + n] - values[t]
                    for n in range(1, horizon + 1)
                ]
                mixture = (1 - lam) * sum(lam ** j * a for j, a in enumerate(nstep[:-1]))
                mixture += lam ** (horizon - 1) * nstep[-1]
                self.close(actual[t], mixture)
        self.vector_close(gae(rewards, values, terminal, terminal, 0.9, 1)[1], [0.61, 0.6, 0.5])
        self.vector_close(gae([2], [1, 5], [False], [True], 0.9, 0.8)[1], [5.5])
        self.vector_close(gae([2], [1, 5], [True], [True], 0.9, 0.8)[1], [1])
        print("15 GAE: delta=[0.07,0.15,0.5], A=[0.4372,0.51,0.5]; lambda=1 telescope PASS")

    def test_16_reward_model_and_trpo(self):
        self.close(softplus(-1), 0.3132616875)
        self.vector_close(
            finite_difference(lambda x: softplus(-(x[0] - x[1])), [2.0, 1.0]),
            [-sigmoid(-1), sigmoid(-1)],
        )
        fisher, gradient, radius = [[2, 0], [0, 8]], [1, 2], 0.01
        natural = solve_linear(fisher, gradient)
        scale = math.sqrt(2 * radius / dot(gradient, natural))
        step = [scale * v for v in natural]
        self.vector_close(step, [0.0707106781, 0.0353553391])
        self.close(0.5 * dot(step, [dot(row, step) for row in fisher]), radius)
        print("16 RM: loss=0.313261688, gradients=+/-0.268941421; TRPO quadratic KL=0.01")

    def test_16_ppo_four_cases_finite_difference(self):
        old_logp = math.log(0.2)
        cases = [(1.3, 2, 2.4, 0), (1.3, -2, -2.6, -2.6),
                 (0.7, 2, 1.4, 1.4), (0.7, -2, -1.6, 0),
                 (1.1, 2, 2.2, 2.2), (1.1, -2, -2.2, -2.2), (1.3, 0, 0, 0)]
        for ratio, advantage, target, derivative in cases:
            logp = old_logp + math.log(ratio)
            fn = lambda x: ppo_surrogate(x[0], old_logp, advantage)
            self.close(fn([logp]), target)
            self.close(finite_difference(fn, [logp])[0], derivative)
            self.close(ppo_logp_gradient(ratio, advantage), derivative)
            p0 = ratio * 0.2
            p = [p0, (1 - p0) / 2, (1 - p0) / 2]
            logits = list(map(math.log, p))
            loss = lambda z: ppo_surrogate(math.log(softmax(z)[0]), old_logp, advantage)
            expected = [derivative * (float(j == 0) - pj) for j, pj in enumerate(p)]
            self.vector_close(finite_difference(loss, logits), expected)
        self.close(ppo_logp_gradient(1.25, 2, upper=1.28), 2.5)
        print("16 PPO four-case values=[2.4,-2.6,1.4,-1.6], d/dlogp=[0,-2.6,1.4,0]")

    def test_16_kl_estimators_values_and_gradients(self):
        p, q, old = [0.6, 0.3, 0.1], [0.2, 0.7, 0.1], [0.3, 0.4, 0.3]
        k1 = [math.log(pi / qi) for pi, qi in zip(p, q)]
        k3 = [qi / pi - 1 + math.log(pi / qi) for pi, qi in zip(p, q)]
        self.close(dot(p, k1), kl(p, q))
        self.close(dot(p, k3), kl(p, q))
        self.assertTrue(all(x >= -1e-15 for x in k3))
        self.assertGreater(abs(dot(old, k3) - kl(p, q)), 0.01)
        self.close(sum(b * (pi / b) * k for b, pi, k in zip(old, p, k3)), kl(p, q))
        self.assertGreater(abs(dot(p, [0.5 * x * x for x in k1]) - kl(p, q)), 0.01)
        fixed_samples = lambda z: sum(
            weight * (qi / pi - 1 + math.log(pi / qi))
            for weight, pi, qi in zip(p, softmax(z), q)
        )
        self.vector_close(finite_difference(fixed_samples, list(map(math.log, p))), [pi - qi for pi, qi in zip(p, q)])
        self.close(-0.1 * math.log(0.2 / 0.1), -0.0693147181)

    def test_17_group_advantages_rloo_and_finite_group_bias(self):
        self.vector_close(group_advantages([1, 1, 0, 0]), [1, 1, -1, -1])
        self.vector_close(rloo([1, 1, 0, 0]), [2 / 3, 2 / 3, -2 / 3, -2 / 3])
        self.vector_close(group_advantages([1, 0, 0, 0]), [math.sqrt(3)] + [-1 / math.sqrt(3)] * 3)
        for rewards in [[0, 0, 0, 0], [1, 1, 1, 1], [1]]:
            self.vector_close(group_advantages(rewards), [0.0] * len(rewards))
        with self.assertRaises(ValueError):
            rloo([1])
        probability, size = 0.3, 4
        centered_gradient = loo_gradient = 0.0
        for actions in itertools.product([0, 1], repeat=size):
            weight = math.prod(probability if a else 1 - probability for a in actions)
            mean = sum(actions) / size
            centered_gradient += weight * sum((a - probability) * (a - mean) for a in actions) / size
            loo_gradient += weight * sum((a - probability) * adv for a, adv in zip(actions, rloo(actions))) / size
        self.close(centered_gradient, (size - 1) / size * probability * (1 - probability))
        self.close(loo_gradient, probability * (1 - probability))
        print("17 exact enumeration: centered gradient=0.1575, RLOO=0.21; zero groups PASS")

    def test_17_aggregation_sampling_and_length_penalty(self):
        lengths, advantages = [2, 8], [1, -1]
        self.close(sum(advantages) / 2, 0)
        self.close(dot(lengths, advantages) / sum(lengths), -0.6)
        self.close(dot(lengths, advantages) / 20, -0.3)
        self.close(1 - 0.5 ** 4 - (1 - 0.5) ** 4, 0.875)
        penalty = lambda length: max(-1.0, min(0.0, (10 - 2 - length) / 2))
        self.vector_close([penalty(length) for length in [7, 8, 9, 10, 11]], [0, 0, -0.5, -1, -1])
        print("17 aggregation: sequence=0, token=-0.6, fixed=-0.3; keep probability=0.875")

    def test_18_dpo_lagrangian_and_gradient(self):
        reference, rewards = [0.5, 0.5], [math.log(3), 0]
        unnormalized = [q * math.exp(r) for q, r in zip(reference, rewards)]
        optimum = [x / sum(unnormalized) for x in unnormalized]
        self.vector_close(optimum, [0.75, 0.25])
        probe = [0.6, 0.4]
        self.close(dot(probe, rewards) - kl(probe, reference), math.log(2) - kl(probe, optimum))
        beta, logs, ref_logs = 0.1, [-2.0, -3.0], [-2.5, -2.7]
        loss = lambda x: softplus(-beta * ((x[0] - ref_logs[0]) - (x[1] - ref_logs[1])))
        coefficient = beta * sigmoid(-0.08)
        self.close(loss(logs), 0.6539469673)
        self.vector_close(finite_difference(loss, logs), [-coefficient, coefficient])
        for beta in [0.1, 0.5, 2.0]:
            logits = [0.3, -0.2, 0.9, -0.5, 0.7, 0.1]
            pw, pl = softmax(logits[:3]), softmax(logits[3:])
            margin = math.log(pw[0]) - ref_logs[0] - math.log(pl[1]) + ref_logs[1]
            coefficient = beta * sigmoid(-beta * margin)
            expected = [-coefficient * (float(i == 0) - pi) for i, pi in enumerate(pw)]
            expected += [coefficient * (float(i == 1) - pi) for i, pi in enumerate(pl)]
            fn = lambda z: loss([math.log(softmax(z[:3])[0]), math.log(softmax(z[3:])[1])])
            self.vector_close(finite_difference(fn, logits), expected)
        self.close(math.log(0.3 / 0.4) - math.log(0.1 / 0.3), math.log(2.25))
        self.assertTrue(math.isfinite(softplus(1000)))
        print("18 DPO: loss=0.653946967, log-prob gradients=+/-0.048001066; logit checks PASS")

    def test_18_ipo_simpo_orpo_kto(self):
        tau, h = 0.5, 0.8
        self.close((h - 1 / (2 * tau)) ** 2, 0.04)
        self.close(finite_difference(lambda x: (x[0] - 1 / (2 * tau)) ** 2, [h])[0], -0.4)
        self.close(0.5 * ((h - 1 / tau) ** 2 + h ** 2), (h - 1 / (2 * tau)) ** 2 + 1 / (4 * tau ** 2))
        simpo = lambda x: softplus(-(2 * (x[0] - x[1]) - 0.2))
        self.close(simpo([-0.5, -0.8]), 0.5130152524)
        self.vector_close(finite_difference(simpo, [-0.5, -0.8]), [-2 * sigmoid(-0.4), 2 * sigmoid(-0.4)])
        log_odds = lambda ell: ell - math.log(-math.expm1(ell))
        orpo = lambda x: -x[0] + 0.1 * softplus(-(log_odds(x[0]) - log_odds(x[1])))
        lw, ll = math.log(0.4), math.log(0.2)
        self.close(softplus(-math.log(8 / 3)), math.log(11 / 8))
        self.close(orpo([lw, ll]), 0.9481361050)
        self.vector_close(finite_difference(orpo, [lw, ll]), [-1 - 0.1 * (3 / 11) / 0.6, 0.1 * (3 / 11) / 0.8])
        for label, sign in [("desirable", -1), ("undesirable", 1)]:
            loss = lambda x: 1 - sigmoid((-sign) * 0.2 * (x[0] - 0.3))
            self.close(loss([0.3]), 0.5, tolerance=1e-12)
            self.close(finite_difference(loss, [0.3])[0], sign * 0.05)
        print("18 family: IPO=0.04, SimPO=0.513015252, ORPO=0.948136105, KTO=0.5")

    def test_19_kl_logit_gradients_and_temperatures(self):
        student, teacher = [0.6, 0.3, 0.1], [0.2, 0.7, 0.1]
        self.close(kl(student, teacher), 0.4049780150)
        self.close(kl(teacher, student), 0.3733860440)
        for temperature in [0.5, 1.0, 2.0, 4.0]:
            for logits, teacher_logits in [
                (list(map(math.log, student)), list(map(math.log, teacher))),
                ([0.2, -0.4, 1.2], [-0.6, 0.7, 0.1]),
            ]:
                p, q = softmax(logits, temperature), softmax(teacher_logits, temperature)
                reverse = kl(p, q)
                for scaled in [False, True]:
                    scale = temperature ** 2 if scaled else 1.0
                    gf = [scale * (pi - qi) / temperature for pi, qi in zip(p, q)]
                    gr = [scale * pi * (math.log(pi / qi) - reverse) / temperature for pi, qi in zip(p, q)]
                    self.vector_close(finite_difference(lambda z: scale * kl(q, softmax(z, temperature)), logits), gf)
                    self.vector_close(finite_difference(lambda z: scale * kl(softmax(z, temperature), q), logits), gr)
                    self.close(sum(gf), 0)
                    self.close(sum(gr), 0)
        reverse_gradient = [pi * (math.log(pi / qi) - kl(student, teacher)) for pi, qi in zip(student, teacher)]
        self.vector_close(reverse_gradient, [0.416181, -0.375683, -0.040498], tolerance=1e-6)
        self.vector_close(finite_difference(lambda z: kl(softmax(z), student), list(map(math.log, student))), [0, 0, 0])
        print(f"19 KL: forward={kl(teacher, student):.9f}, reverse={kl(student, teacher):.9f}; temperature checks PASS")

    def test_19_local_versus_trajectory_gradient(self):
        cost_one = kl([0.75, 0.25], [0.25, 0.75])

        def exact_trajectory(x):
            first = sigmoid(x[0])
            student, teacher = [], []
            for a0, a1 in itertools.product([0, 1], repeat=2):
                ps = [0.5, 0.5] if a0 == 0 else [0.75, 0.25]
                qt = [0.5, 0.5] if a0 == 0 else [0.25, 0.75]
                student.append((first if a0 else 1 - first) * ps[a1])
                teacher.append(0.5 * qt[a1])
            return kl(student, teacher)

        chain = lambda x: kl([1 - sigmoid(x[0]), sigmoid(x[0])], [0.5, 0.5]) + sigmoid(x[0]) * cost_one
        fixed_prefix = lambda x: kl([1 - sigmoid(x[0]), sigmoid(x[0])], [0.5, 0.5]) + 0.5 * cost_one
        for h in [-0.3, 0.0, 0.4]:
            self.close(exact_trajectory([h]), chain([h]))
        self.close(finite_difference(exact_trajectory, [0])[0], math.log(3) / 8)
        self.close(finite_difference(fixed_prefix, [0])[0], 0)
        print("19 trajectory counterexample: exact d/dh=log(3)/8=0.137326536, fixed-prefix=0")

    def test_19_privileged_forward_kl_decomposition(self):
        teachers, weights, student = [[0.9, 0.1], [0.2, 0.8]], [0.4, 0.6], [0.55, 0.45]
        average = [sum(w * q[i] for w, q in zip(weights, teachers)) for i in range(2)]
        lhs = sum(w * kl(q, student) for w, q in zip(weights, teachers))
        irreducible = sum(w * kl(q, average) for w, q in zip(weights, teachers))
        self.close(lhs, irreducible + kl(average, student))
        self.close(0.5 * kl([1, 0], [0.5, 0.5]) + 0.5 * kl([0, 1], [0.5, 0.5]), math.log(2))
        print("19 privileged hidden-coin lower bound=log(2); forward-KL decomposition PASS")


if __name__ == "__main__":
    unittest.main(verbosity=2)
