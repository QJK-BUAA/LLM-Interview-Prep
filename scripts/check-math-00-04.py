#!/usr/bin/env python3
"""Deterministic worked-example checks for chapters 00-04; standard library only.

Run: python3 scripts/check-math-00-04.py
Each check names the lesson section containing its data and expected result.
Gradients are checked against scalar objectives by central differences; Hessians
are checked by differentiating analytic gradients. No ML framework is imported.
"""

import itertools
import math


CHECKS = []


def close(actual, expected, tol=1e-9):
    if isinstance(expected, (tuple, list)):
        assert len(actual) == len(expected), (actual, expected)
        for a, e in zip(actual, expected):
            close(a, e, tol)
    else:
        assert math.isfinite(actual), actual
        assert math.isclose(actual, expected, rel_tol=tol, abs_tol=tol), (
            actual, expected, tol
        )


def dot(a, b):
    assert len(a) == len(b)
    return sum(x * y for x, y in zip(a, b))


def mv(matrix, vector):
    return [dot(row, vector) for row in matrix]


def transpose(matrix):
    return [list(row) for row in zip(*matrix)]


def mm(a, b):
    return [[dot(row, col) for col in transpose(b)] for row in a]


def solve2(a, b):
    determinant = a[0][0] * a[1][1] - a[0][1] * a[1][0]
    if determinant == 0:
        raise ValueError("singular matrix")
    return [
        (b[0] * a[1][1] - a[0][1] * b[1]) / determinant,
        (a[0][0] * b[1] - b[0] * a[1][0]) / determinant,
    ]


def finite_gradient(function, point, step=1e-5):
    result = []
    for j in range(len(point)):
        plus, minus = list(point), list(point)
        plus[j] += step
        minus[j] -= step
        result.append((function(plus) - function(minus)) / (2 * step))
    return result


def gradient_check(function, point, expected):
    numeric = finite_gradient(function, point)
    close(numeric, expected, 2e-6)
    return max(abs(a - b) for a, b in zip(numeric, expected))


def hessian_check(gradient, point, expected):
    numeric = [
        finite_gradient(lambda z: gradient(z)[j], point)
        for j in range(len(point))
    ]
    close(numeric, expected, 2e-6)
    return max(
        abs(a - b) for row, ref in zip(numeric, expected)
        for a, b in zip(row, ref)
    )


def sigmoid(x):
    if x >= 0:
        return 1 / (1 + math.exp(-x))
    exp_x = math.exp(x)
    return exp_x / (1 + exp_x)


def softplus(x):
    return max(x, 0) + math.log1p(math.exp(-abs(x)))


def entropy(probabilities):
    return -sum(p * math.log(p) for p in probabilities if p > 0)


def kl(p, q):
    total = 0.0
    for pi, qi in zip(p, q):
        if pi == 0:
            continue
        if qi == 0:
            return math.inf
        total += pi * math.log(pi / qi)
    return total


def report(section, **values):
    CHECKS.append(section)
    numbers = ", ".join(f"{key}={value:.9f}" for key, value in values.items())
    print(f"PASS {section}: {numbers}")


def check_00():
    x, y, b = [1, 2, 3], [50, 60, 70], 40

    def mse(point):
        return sum((point[0] * xi + b - yi) ** 2 for xi, yi in zip(x, y)) / 3

    error = gradient_check(mse, [8], [-56 / 3])
    w = 8 - 0.05 * (-56 / 3)
    close(w, 134 / 15)
    close(mse([8]), 56 / 3)
    close(mse([w]), 3584 / 675)
    report("00/derivation", weight=w, new_mse=mse([w]), gradient_error=error)

    gaussian_nll = math.log(2 * math.pi) / 2 + (1 ** 2 + (-1) ** 2) / 4
    bernoulli_nll = -(math.log(0.8) + math.log(0.7)) / 2
    close(gaussian_nll, 1.4189385332046727)
    close(bernoulli_nll, 0.2899092476264711)
    report("00/math-likelihood", gaussian_nll=gaussian_nll, ce=bernoulli_nll)

    reward = lambda point: 2 * sigmoid(point[0])
    error = gradient_check(reward, [0], [0.5])
    score_gradient = sum(
        prob * r * (a - 0.5)
        for a, prob, r in [(0, 0.5, 0), (1, 0.5, 2)]
    )
    baseline_gradient = sum(
        prob * (r - 1.7) * (a - 0.5)
        for a, prob, r in [(0, 0.5, 0), (1, 0.5, 2)]
    )
    close(score_gradient, 0.5)
    close(baseline_gradient, score_gradient)
    close(reward([0.1]), 1.04995837495788)
    report("00/math-reward", gradient=score_gradient,
           new_reward=reward([0.1]), gradient_error=error)

    train_a = dot([0.9, 0.1], [0, 4])
    deploy_a = dot([0.5, 0.5], [0, 4])
    close([train_a, deploy_a], [0.4, 2])
    assert train_a < 1 < deploy_a
    report("00/math-generalization", train_a=train_a, deploy_a=deploy_a)


def check_01():
    # One scalar objective checks every input, weight and bias coordinate.
    def loss(point):
        x = [point[:2], point[2:4]]
        w, b = point[4:6], point[6]
        return sum((pred + b - y) ** 2 for pred, y in zip(mv(x, w), [0, 1])) / 2

    point = [1, 2, 3, 4, 2, -1, 1]
    close(loss(point), 2.5)
    error = gradient_check(loss, point, [2, -1, 4, -2, 7, 10, 3])
    report("01/math-matmul-backward", loss=loss(point), gradient_error=error)

    upstream = [[[1, 2], [3, 4]], [[5, 6], [7, 8]]]

    def broadcast_loss(bias, axis):
        return sum(
            upstream[b][s][h] * bias[h if axis == "feature" else s]
            for b in range(2) for s in range(2) for h in range(2)
        )

    feature_error = gradient_check(
        lambda bias: broadcast_loss(bias, "feature"), [0.2, -0.3], [16, 20]
    )
    position_error = gradient_check(
        lambda bias: broadcast_loss(bias, "position"), [0.2, -0.3], [14, 22]
    )
    close(sum(v for batch in upstream for row in batch for v in row), 36)
    report("01/math-broadcast-backward",
           feature_gradient_error=feature_error, position_gradient_error=position_error)

    losses = [1, 3, 99, 2, 4, 6]
    mask = [1, 1, 0, 1, 1, 1]

    def masked_mean(values, weights):
        count = sum(weights)
        if count <= 0:
            raise ValueError("empty mask must be skipped")
        return dot(values, weights) / count

    token_mean = lambda values: masked_mean(values, mask)
    sequence_mean = lambda values: (
        masked_mean(values[:3], mask[:3]) + masked_mean(values[3:], mask[3:])
    ) / 2
    close(token_mean(losses), 3.2)
    close(sequence_mean(losses), 3)
    gradient_check(token_mean, losses, [0.2, 0.2, 0, 0.2, 0.2, 0.2])
    gradient_check(sequence_mean, losses, [0.25, 0.25, 0, 1 / 6, 1 / 6, 1 / 6])
    gradient_check(
        lambda weights: masked_mean([1, 3], weights),
        [1, 1], [-0.5, 0.5],
    )
    try:
        masked_mean(losses, [0] * len(mask))
    except ValueError:
        pass
    else:
        raise AssertionError("empty mask accepted")
    close((2 * 2 + 3 * 4) / 5, token_mean(losses))
    report("01/math-masked-mean", token_mean=token_mean(losses),
           sequence_mean=sequence_mean(losses))

    snd = [[[0], [1]], [[10], [11]]]
    nsd = [[snd[s][n] for s in range(2)] for n in range(2)]
    wrong = [v for head in nsd for position in head for v in position]
    restored = [nsd[n][s][0] for s in range(2) for n in range(2)]
    assert wrong == [0, 10, 1, 11]
    assert restored == [0, 1, 10, 11]
    q, k = [[1, 2], [3, 4]], [[2, 0], [1, 1]]
    explicit = [[sum(q[s][d] * k[t][d] for d in range(2))
                 for t in range(2)] for s in range(2)]
    close(explicit, mm(q, transpose(k)))
    report("01/math-einsum-layout", wrong_second=wrong[1],
           restored_second=restored[1])


def check_02():
    chain = lambda point: 0.5 * ((2 * point[0]) ** 2 - 20) ** 2
    gradient_check(chain, [3], [384])
    close(chain([3]), 128)
    close(3 - 0.001 * 384, 2.616)
    report("02/example", gradient=384, updated_weight=2.616)

    x = [[1, 2], [3, 4]]
    mse = lambda point: sum(
        (dot(row, point[:2]) + point[2] - yi) ** 2
        for row, yi in zip(x, [0, 1])
    ) / 2
    gradient_check(mse, [2, -1, 1], [7, 10, 3])
    report("02/derivation", mse=mse([2, -1, 1]))

    a, c = [[3, 1], [1, 2]], [-1, 0]
    objective = lambda point: dot(point, mv(a, point)) / 2 + dot(c, point)
    gradient = lambda point: [v + ci for v, ci in zip(mv(a, point), c)]
    error = gradient_check(objective, [1, 2], [4, 5])
    h_error = hessian_check(gradient, [1, 2], a)
    close(objective([1, 2]), 6.5)
    close(objective([0.6, 1.5]), 3.09)
    largest = (5 + math.sqrt(5)) / 2
    assert 0 < 0.1 < 2 / largest
    nonsymmetric = [[1, 3], [0, 2]]
    gradient_check(
        lambda point: dot(point, mv(nonsymmetric, point)) / 2,
        [1, 2], [4, 5.5],
    )
    report("02/math-quadratic", new_loss=3.09, lambda_max=largest,
           gradient_error=error, hessian_error=h_error)

    a = [[2, 1], [1, 2]]
    v1 = [1 / math.sqrt(2), 1 / math.sqrt(2)]
    v2 = [1 / math.sqrt(2), -1 / math.sqrt(2)]
    close(mv(a, v1), [3 * v for v in v1])
    close(mv(a, v2), v2)
    close(dot(v1, v2), 0)
    close(dot(v1, mv(a, v1)), 3)
    report("02/math-eigen", largest=3, smallest=1, determinant=3)

    x = [[3, 0], [0, 2], [0, 0]]
    u, singular, vt = [[1, 0], [0, 1], [0, 0]], [[3, 0], [0, 2]], [[1, 0], [0, 1]]
    close(mm(mm(u, singular), vt), x)
    pseudo = [[1 / 3, 0, 0], [0, 1 / 2, 0]]
    close(mm(mm(x, pseudo), x), x)
    weights = mv(pseudo, [3, 4, 5])
    close(weights, [1, 2])
    prediction = mv(x, weights)
    residual_sse = sum((p - y) ** 2 for p, y in zip(prediction, [3, 4, 5]))
    close(residual_sse, 25)
    report("02/math-svd", rank_one_sse=2 ** 2, least_squares_sse=residual_sse)

    points = [[2, 0], [-2, 0], [0, 1], [0, -1]]
    mean = [sum(col) / 4 for col in transpose(points)]
    close(mean, [0, 0])
    covariance = [[v / 4 for v in row] for row in mm(transpose(points), points)]
    close(covariance, [[2, 0], [0, 0.5]])
    scores = mv(points, [1, 0])
    reconstructed = [[z, 0] for z in scores]
    pca_sse = sum((a - b) ** 2 for row, rec in zip(points, reconstructed)
                  for a, b in zip(row, rec))
    close(pca_sse, 2)
    close(2 / 2.5, 0.8)
    close(math.sqrt(2) ** 2, pca_sse)
    report("02/math-pca", explained_ratio=0.8, sse=pca_sse, mse=pca_sse / 4)

    x, y = [[1, 1], [2, 2]], [1, 2]
    xtx = mm(transpose(x), x)
    try:
        solve2(xtx, [5, 5])
    except ValueError:
        pass
    else:
        raise AssertionError("rank-deficient normal matrix accepted")
    hessian = [[6, 5], [5, 6]]
    ridge = lambda point: (
        sum((p - yi) ** 2 for p, yi in zip(mv(x, point), y)) + dot(point, point)
    ) / 2
    grad = lambda point: [v - 5 for v in mv(hessian, point)]
    gradient_check(ridge, [0.2, -0.1], grad([0.2, -0.1]))
    hessian_check(grad, [0.2, -0.1], hessian)
    optimum = solve2(hessian, mv(transpose(x), y))
    close(optimum, [5 / 11, 5 / 11])
    close(grad(optimum), [0, 0])
    close(ridge(optimum), 5 / 22)
    close(mv(x, [0.5, 0.5]), y)
    report("02/math-ridge", weight=optimum[0], regularized_loss=ridge(optimum))

    def soft_threshold(z, penalty):
        return math.copysign(max(abs(z) - penalty, 0), z)

    lasso = [soft_threshold(z, 1) for z in [-3, 0.5, 2]]
    close(lasso, [-2, 0, 1])
    close([z / 2 for z in [-3, 0.5, 2]], [-1.5, 0.25, 1])
    for z in [-3, -1, -0.5, 0, 0.5, 1, 2]:
        optimum = soft_threshold(z, 1)
        objective = lambda point: (point[0] - z) ** 2 / 2 + abs(point[0])
        if optimum == 0:
            assert abs(z) <= 1  # Exact subgradient test, not a derivative at the cusp.
        else:
            gradient_check(objective, [optimum], [0])
        assert all(objective([optimum]) <= objective([candidate / 100]) + 1e-12
                   for candidate in range(-500, 501))
    coordinate = soft_threshold(3, 1) / 2
    gradient_check(lambda point: point[0] ** 2 - 3 * point[0] + abs(point[0]),
                   [coordinate], [0])
    report("02/math-lasso", negative=-2, zero=0, positive=1, zero_objective=0.125,
           coordinate_update=coordinate)


def check_03():
    joint = [0.01 * 0.9, 0.99 * 0.05]
    posterior = joint[0] / sum(joint)
    odds = (0.9 / 0.05) * (0.01 / 0.99)
    close(posterior, 2 / 13)
    close(odds / (1 + odds), posterior)
    report("03/math-bayes", positive_rate=sum(joint), posterior=posterior)

    samples = [1, 2, 3]
    mean = sum(samples) / 3
    second = sum(x * x for x in samples) / 3
    close([mean, second - mean ** 2], [2, 2 / 3])
    unbiased = sum((x - mean) ** 2 for x in samples) / 2
    # Enumerate all iid Bernoulli(1/2) samples to verify Bessel's correction.
    expected_variance = 0
    for sample in itertools.product([0, 1], repeat=3):
        average = sum(sample) / 3
        expected_variance += sum((x - average) ** 2 for x in sample) / 2 / 8
    close(expected_variance, 0.25)
    group_means = [0, 2]
    total_variance = 1 + sum((m - 1) ** 2 for m in group_means) / 2
    close(total_variance, 2)
    report("03/math-moments", mean=mean, moment_variance=2 / 3,
           unbiased_variance=unbiased, total_variance=total_variance)

    nll = lambda point: -2 * math.log(point[0]) - math.log1p(-point[0])
    negative_posterior = lambda point: -3 * math.log(point[0]) - 2 * math.log1p(-point[0])
    gradient_check(nll, [2 / 3], [0])
    gradient_check(negative_posterior, [0.6], [0])
    gaussian = lambda point: (
        1.5 * math.log(2 * math.pi * point[1])
        + sum((x - point[0]) ** 2 for x in samples) / (2 * point[1])
    )
    gradient_check(gaussian, [2, 2 / 3], [0, 0])
    report("03/math-mle-map", mle=2 / 3, map=0.6, posterior_mean=4 / 7,
           all_positive_map=4 / 5)

    p, q = [0.8, 0.2], [0.6, 0.4]
    h, ce = entropy(p), -sum(pi * math.log(qi) for pi, qi in zip(p, q))
    close(h + kl(p, q), ce)
    close([h, ce, kl(p, q), kl(q, p)], [
        0.5004024235381879, 0.5919186453876236,
        0.09151622184943578, 0.10464962875290948,
    ])
    assert math.isinf(kl([0.5, 0.5], [1, 0]))
    close(kl([1, 0], [0.5, 0.5]), math.log(2))
    report("03/derivation", entropy=h, ce=ce, kl=kl(p, q), reverse_kl=kl(q, p))

    se = 2 / math.sqrt(100)
    lower, upper = 10 - 1.96 * se, 10 + 1.96 * se
    close([lower, upper], [9.608, 10.392])
    z, n, proportion = 1.96, 10, 1.0
    center = proportion + z * z / (2 * n)
    radius = z * math.sqrt(proportion * (1 - proportion) / n + z * z / (4 * n * n))
    denominator = 1 + z * z / n
    wilson_lower, wilson_upper = (center - radius) / denominator, (center + radius) / denominator
    close(wilson_lower, n / (n + z * z))
    close(wilson_upper, 1)
    report("03/math-confidence", mean_lower=lower, mean_upper=upper,
           wilson_lower=wilson_lower, wilson_upper=wilson_upper)

    p, q, f = [0.75, 0.25], [0.5, 0.5], [2, 0]
    weights = [pi / qi for pi, qi in zip(p, q)]
    transformed = [w * fi for w, fi in zip(weights, f)]
    ordinary_mean = dot(q, transformed)
    variance = dot(q, [v * v for v in transformed]) - ordinary_mean ** 2
    single_snis_mean = dot(q, f)
    clipped_mean = dot(q, [min(w, 1) * fi for w, fi in zip(weights, f)])
    two_snis_mean = sum(
        q[a] * q[b] * (weights[a] * f[a] + weights[b] * f[b]) / (weights[a] + weights[b])
        for a, b in itertools.product(range(2), repeat=2)
    )
    ess = sum(weights) ** 2 / sum(w * w for w in weights)
    close([ordinary_mean, variance, single_snis_mean, clipped_mean, ess, two_snis_mean],
          [1.5, 2.25, 1, 1, 1.6, 1.25])
    report("03/math-importance-sampling", ordinary_mean=ordinary_mean,
           single_variance=variance, single_snis_mean=single_snis_mean, ess=ess)


def check_04():
    design, labels = [[1, 1], [2, 1]], [0, 1]

    def logistic(point, penalty=0):
        return sum(softplus(dot(row, point)) - y * dot(row, point)
                   for row, y in zip(design, labels)) / 2 + penalty * point[0] ** 2 / 2

    def logistic_gradient(point, penalty=0):
        residual = [sigmoid(dot(row, point)) - y for row, y in zip(design, labels)]
        result = [v / 2 for v in mv(transpose(design), residual)]
        result[0] += penalty * point[0]
        return result

    def logistic_hessian(point, penalty=0):
        probabilities = [sigmoid(dot(row, point)) for row in design]
        result = [[sum(p * (1 - p) * row[j] * row[k]
                       for p, row in zip(probabilities, design)) / 2
                   for k in range(2)] for j in range(2)]
        result[0][0] += penalty
        return result

    close(logistic_gradient([0, 0]), [-0.25, 0])
    close(logistic_hessian([0, 0]), [[0.625, 0.375], [0.375, 0.25]])
    error = gradient_check(lambda point: logistic(point, 0.1), [0.3, -0.2],
                           logistic_gradient([0.3, -0.2], 0.1))
    h_error = hessian_check(lambda point: logistic_gradient(point, 0.1),
                            [0.3, -0.2], logistic_hessian([0.3, -0.2], 0.1))
    assert logistic([0.025, 0]) < math.log(2)
    assert math.isfinite(softplus(1000)) and math.isfinite(softplus(-1000))
    report("04/math-logistic", initial_loss=logistic([0, 0]),
           updated_loss=logistic([0.025, 0]), gradient_error=error, hessian_error=h_error)

    spam = [[1, 1], [1, 1], [1, 1], [0, 1]]
    normal = [[1, 0], [0, 0], [0, 0], [0, 0]]
    probabilities = [[(sum(column) + 1) / (len(rows) + 2)
                      for column in transpose(rows)] for rows in [spam, normal]]
    close(probabilities, [[4 / 6, 5 / 6], [2 / 6, 1 / 6]])
    log_scores = [math.log(0.5) + sum(math.log(p) for p in row) for row in probabilities]
    maximum = max(log_scores)
    log_normalizer = maximum + math.log(sum(math.exp(s - maximum) for s in log_scores))
    posterior = math.exp(log_scores[0] - log_normalizer)
    close(posterior, 10 / 11)
    absent_weights = [0.5 * math.prod(1 - p for p in row) for row in probabilities]
    close(absent_weights[0] / sum(absent_weights), 1 / 11)
    close(log_scores, [math.log(10 / 36), math.log(1 / 36)])
    report("04/math-naive-bayes", spam_log_score=log_scores[0],
           normal_log_score=log_scores[1], spam_posterior=posterior)

    distances, labels = [1, 2, 3], [1, 0, 0]
    weights = [1 / d for d in distances]
    probability = dot(weights, labels) / sum(weights)
    close(probability, 6 / 11)
    assert sum(labels) / 3 < 0.5 < probability
    raw_a, raw_b = math.hypot(1, 100), math.hypot(3, 0)
    scaled_a, scaled_b = math.hypot(1 / 1, 100 / 100), math.hypot(3 / 1, 0 / 100)
    assert raw_a > raw_b and scaled_a < scaled_b
    widths = [0.1 ** (1 / d) for d in [2, 10, 100]]
    close(widths, [0.31622776601683794, 0.7943282347242815, 0.9772372209558107])
    for dimension, width in zip([2, 10, 100], widths):
        close(width ** dimension, 0.1)
    report("04/math-knn", weighted_positive=probability, raw_a=raw_a,
           scaled_a=scaled_a, width_100d=widths[-1])

    dual = lambda a: 2 * a - 2 * a * a
    close(dual(0.5), 0.5)
    gradient_check(lambda point: dual(point[0]), [0.5], [0])
    assert all(dual(a / 100) <= dual(0.5) for a in range(101))
    w = sum(alpha * y * x for alpha, y, x in [(0.5, -1, -1), (0.5, 1, 1)])
    close(w, 1)
    close(w * w / 2, dual(0.5))
    values = [-1, 0, 2]
    features = [[1, math.sqrt(2) * x, x * x] for x in values]
    gram = [[(1 + x * y) ** 2 for y in values] for x in values]
    close(gram, mm(features, transpose(features)))
    for coefficients in itertools.product([-1, 0, 1], repeat=3):
        assert dot(coefficients, mv(gram, coefficients)) >= -1e-10
    report("04/math-svm", alpha=0.5, weight=w, primal=0.5, dual=dual(0.5))

    parent_h, child_h = entropy([0.5, 0.5]), (4 / 6) * entropy([0.25, 0.75])
    entropy_gain, gini_gain = parent_h - child_h, 0.5 - (4 / 6) * 0.375
    close(entropy_gain, 0.31825708414740644)
    close(gini_gain, 0.25)
    gradient_check(lambda point: (1 - point[0]) ** 2 + (3 - point[0]) ** 2, [2], [0])
    report("04/math-tree", child_entropy=child_h, entropy_gain=entropy_gain,
           gini_gain=gini_gain)

    forest_variance = 4 * (0.25 + 0.75 / 10)
    covariance_sum = (10 * 4 + 10 * 9 * 0.25 * 4) / 100
    close(forest_variance, covariance_sum)
    close(forest_variance, 1.3)
    predictions = [2 + 0.5 * r for r in [-1, 1]]
    boost_loss = sum((p - y) ** 2 for p, y in zip(predictions, [1, 3])) / 2
    close(predictions, [1.5, 2.5])
    close(boost_loss, 0.25)
    report("04/math-rf-gbdt", forest_variance=forest_variance, boost_loss=boost_loss)

    epsilon = 0.25
    alpha = 0.5 * math.log((1 - epsilon) / epsilon)
    normalization = lambda point: (1 - epsilon) * math.exp(-point[0]) + epsilon * math.exp(point[0])
    gradient_check(normalization, [alpha], [0])
    z = normalization([alpha])
    updated_weights = [0.25 * math.exp(-alpha) / z] * 3 + [0.25 * math.exp(alpha) / z]
    close(updated_weights, [1 / 6, 1 / 6, 1 / 6, 0.5])
    close(sum(updated_weights), 1)
    close(z, math.sqrt(3) / 2)
    assert z < 1
    report("04/math-adaboost", alpha=alpha, normalization=z,
           correct_weight=updated_weights[0], incorrect_weight=updated_weights[-1])

    gradients, curvature, penalty, gamma = [2, -2], [2, 2], 1, 0.1
    leaf_objective = lambda point: sum(
        g * w + (h + penalty) * w * w / 2
        for w, g, h in zip(point, gradients, curvature)
    ) + 2 * gamma
    optimum = [-g / (h + penalty) for g, h in zip(gradients, curvature)]
    gradient_check(leaf_objective, [-0.4, 0.6], [0.8, -0.2])
    gradient_check(leaf_objective, optimum, [0, 0])
    split_gain = sum(g * g / (h + penalty) for g, h in zip(gradients, curvature)) / 2 - gamma
    parent_actual = 2 + gamma
    child_actual = sum((pred - y) ** 2 for pred, y in
                       zip([optimum[0]] * 2 + [optimum[1]] * 2, [-1, -1, 1, 1])) / 2
    child_actual += sum(w * w for w in optimum) / 2 + 2 * gamma
    close(optimum, [-2 / 3, 2 / 3])
    close(split_gain, 37 / 30)
    close(child_actual, 13 / 15)
    close(parent_actual - child_actual, split_gain)
    report("04/math-xgboost", left_weight=optimum[0], right_weight=optimum[1],
           gain=split_gain, child_objective=child_actual)

    points, centers = [0, 2, 8, 10], [0, 8]
    assignments = [min(range(2), key=lambda k: (x - centers[k]) ** 2) for x in points]
    updated = [sum(x for x, z in zip(points, assignments) if z == k) / assignments.count(k)
               for k in range(2)]
    old_sse = sum((x - centers[z]) ** 2 for x, z in zip(points, assignments))
    new_sse = sum((x - updated[z]) ** 2 for x, z in zip(points, assignments))
    close([old_sse, new_sse], [8, 4])
    close(updated, [1, 9])
    gradient_check(lambda point: (0 - point[0]) ** 2 + (2 - point[0]) ** 2, [1], [0])
    report("04/math-kmeans", old_sse=old_sse, new_sse=new_sse, first_center=updated[0])

    def normal(x, mean, variance):
        return math.exp(-(x - mean) ** 2 / (2 * variance)) / math.sqrt(2 * math.pi * variance)

    points, means, variances, mixture = [-1, 1], [-1, 1], [1, 1], [0.5, 0.5]
    responsibilities = []
    for x in points:
        weighted = [pi * normal(x, mu, var) for pi, mu, var in zip(mixture, means, variances)]
        responsibilities.append([v / sum(weighted) for v in weighted])
    counts = [sum(col) for col in transpose(responsibilities)]
    new_means = [sum(row[k] * x for row, x in zip(responsibilities, points)) / counts[k]
                 for k in range(2)]
    new_vars = [sum(row[k] * (x - new_means[k]) ** 2 for row, x in
                    zip(responsibilities, points)) / counts[k] for k in range(2)]

    def log_likelihood(mu, var):
        return sum(math.log(sum(0.5 * normal(x, m, v) for m, v in zip(mu, var)))
                   for x in points)

    old_ll, new_ll = log_likelihood(means, variances), log_likelihood(new_means, new_vars)
    close(responsibilities[0][0], sigmoid(2))
    close(counts, [1, 1])
    close(new_means, [-math.tanh(1), math.tanh(1)])
    close(new_vars, [1 - math.tanh(1) ** 2] * 2)
    assert new_ll >= old_ll
    # Jensen lower bound touches old likelihood at the E-step posterior.
    bound = sum(r * (math.log(0.5 * normal(x, means[k], variances[k])) - math.log(r))
                for x, row in zip(points, responsibilities) for k, r in enumerate(row))
    close(bound, old_ll)
    report("04/math-em", responsibility=responsibilities[0][0], right_mean=new_means[1],
           variance=new_vars[0], old_log_likelihood=old_ll, new_log_likelihood=new_ll)

    pair_loss = lambda point: softplus(-(point[0] - point[1]))
    gradient_check(pair_loss, [0, 0], [-0.5, 0.5])
    gradient_check(pair_loss, [0.3, -0.1], [sigmoid(0.4) - 1, 1 - sigmoid(0.4)])

    def dcg(relevance):
        return sum((2 ** r - 1) / math.log2(i + 2) for i, r in enumerate(relevance))

    actual, ideal = dcg([2, 0, 1]), dcg([2, 1, 0])
    ndcg = actual / ideal
    close(actual, 3.5)
    close(ideal, 3.6309297535714578)
    close(ndcg, 0.9639404333166532)
    close(pair_loss([0.1, -0.1]), 0.5981388693815918)
    report("04/math-ranking", pair_loss=pair_loss([0.1, -0.1]),
           dcg=actual, ndcg=ndcg, reciprocal_rank=0.5, recall_at_2=0.5)

    labels = [1, 0, 1, 0, 0, 1, 0, 0]
    scores = [0.9, 0.8, 0.7, 0.6, 0.4, 0.3, 0.2, 0.1]
    positives = [s for y, s in zip(labels, scores) if y]
    negatives = [s for y, s in zip(labels, scores) if not y]
    auc = sum((p > n) + 0.5 * (p == n) for p in positives for n in negatives)
    auc /= len(positives) * len(negatives)
    close(auc, 11 / 15)
    precision, recall = 2 / 4, 2 / 3
    close(2 * precision * recall / (precision + recall), 4 / 7)
    fraud_f1 = 2 * 80 / (2 * 80 + 120 + 20)
    close(fraud_f1, 8 / 15)
    threshold = 1 / (1 + 9)
    positive_cost, negative_cost = 1 * (1 - 0.2), 9 * 0.2
    assert positive_cost < negative_cost
    report("04/derivation", auc=auc, fraud_f1=fraud_f1, cost_threshold=threshold,
           positive_cost=positive_cost, negative_cost=negative_cost)

    # Enumerate independent training-set predictions and zero-mean test noise.
    risk = sum((2 + noise - prediction) ** 2 for noise, prediction in
               itertools.product([-0.5, 0.5], [1, 3])) / 4
    stable_risk = sum((2 + noise - 1.5) ** 2 for noise in [-0.5, 0.5]) / 2
    close([risk, stable_risk], [1.25, 0.5])
    report("04/math-bias-variance", variable_model_risk=risk, stable_model_risk=stable_risk)


def main():
    check_00()
    check_01()
    check_02()
    check_03()
    check_04()
    print(f"\nAll {len(CHECKS)} section checks passed (standard library only).")


if __name__ == "__main__":
    main()
