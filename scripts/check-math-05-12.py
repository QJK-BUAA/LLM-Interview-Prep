#!/usr/bin/env python3
"""Verify chapter 05-12 worked examples and gradients using only the stdlib.

Fixtures correspond to the section IDs recorded in interview-audit-05-12.md.
Analytic derivatives are checked against central differences of forward losses,
not against a second copy of the derivative formula. No NumPy/autograd required.
"""

import copy
import math
from collections import Counter


CHECKS = 0
GRADIENT_REPORTS = []


def flat(value):
    if isinstance(value, (list, tuple)):
        return [x for part in value for x in flat(part)]
    return [value]


def rebuild(template, values):
    if isinstance(template, (list, tuple)):
        return [rebuild(part, values) for part in template]
    return next(values)


def close(actual, expected, name, atol=1e-9, rtol=1e-9):
    global CHECKS
    left, right = flat(actual), flat(expected)
    assert len(left) == len(right), f"{name}: size mismatch"
    for index, (a, b) in enumerate(zip(left, right)):
        assert math.isfinite(a) and math.isfinite(b), f"{name}: non-finite"
        assert abs(a - b) <= atol + rtol * max(abs(a), abs(b)), (
            f"{name}[{index}]: actual={a:.12g}, expected={b:.12g}"
        )
    CHECKS += 1


def gradient_check(name, forward, params, analytic, step=1e-6):
    assert set(params) == set(analytic), f"{name}: unchecked parameter"
    max_error, coordinates = 0.0, 0
    for key, value in params.items():
        values, expected = flat(value), flat(analytic[key])
        assert len(values) == len(expected)
        numerical = []
        for index in range(len(values)):
            plus, minus = copy.deepcopy(params), copy.deepcopy(params)
            vp, vm = list(values), list(values)
            vp[index] += step
            vm[index] -= step
            plus[key] = rebuild(value, iter(vp))
            minus[key] = rebuild(value, iter(vm))
            numerical.append((forward(plus) - forward(minus)) / (2 * step))
        close(numerical, expected, name + "/" + key, atol=2e-6, rtol=2e-6)
        max_error = max(max_error, max(abs(a - b) for a, b in zip(numerical, expected)))
        coordinates += len(values)
    GRADIENT_REPORTS.append((name, coordinates, max_error))


def dot(a, b):
    assert len(a) == len(b)
    return sum(x * y for x, y in zip(a, b))


def transpose(a):
    assert a and all(len(row) == len(a[0]) for row in a)
    return [list(column) for column in zip(*a)]


def mm(a, b):
    bt = transpose(b)
    return [[dot(row, col) for col in bt] for row in a]


def scale(a, factor):
    return [[factor * value for value in row] for row in a]


def sigmoid(x):
    return 1 / (1 + math.exp(-x))


def softmax(logits, mask=None):
    allowed = [True] * len(logits) if mask is None else mask
    if not any(allowed):
        raise ValueError("softmax has no allowed key")
    maximum = max(z for z, keep in zip(logits, allowed) if keep)
    weights = [math.exp(z - maximum) if keep else 0.0
               for z, keep in zip(logits, allowed)]
    return [weight / sum(weights) for weight in weights]


def cross_entropy(logits, target):
    maximum = max(logits)
    log_z = maximum + math.log(sum(math.exp(z - maximum) for z in logits))
    return log_z - dot(target, logits)


def check_neural_networks():
    # 05/math-activations, math-softmax-ce, derivation, math-gradient-check.
    close(sigmoid(math.log(3)), 0.75, "sigmoid")
    close(2 * 0.75 * 0.25, 3 / 8, "sigmoid backward")
    close((1 / 4) ** 10, 9.5367431640625e-7, "sigmoid chain")
    z, target = [math.log(2), 0.0, 0.0], [0.0, 1.0, 0.0]
    p = softmax(z)
    close(p, [0.5, 0.25, 0.25], "softmax probabilities")
    close(cross_entropy(z, target), math.log(4), "CE loss")
    jacobian = [[p[i] * ((i == j) - p[j]) for j in range(3)] for i in range(3)]
    close(jacobian, [[0.25, -0.125, -0.125],
                     [-0.125, 0.1875, -0.0625],
                     [-0.125, -0.0625, 0.1875]], "softmax Jacobian")
    for i in range(3):
        gradient_check(f"05 softmax row {i}", lambda v, i=i: softmax(v["z"])[i],
                       {"z": z}, {"z": jacobian[i]})
    gradient_check("05 softmax CE", lambda v: cross_entropy(v["z"], target),
                   {"z": z}, {"z": [a - b for a, b in zip(p, target)]})
    close(softmax([v + 1000 for v in z]), p, "stable logit shift")

    params = {"X": [[1.0, 2.0]], "W1": [[1.0, -1.0], [0.0, 1.0]],
              "b1": [0.0, 0.0], "W2": [[1.0, 0.0], [0.0, 1.0]],
              "b2": [0.0, 0.0]}

    def mlp(v):
        z1 = mm(v["X"], v["W1"])
        h = [[max(0.0, x + b) for x, b in zip(row, v["b1"])] for row in z1]
        z2 = mm(h, v["W2"])
        return sum(cross_entropy([x + b for x, b in zip(row, v["b2"])], [1, 0])
                   for row in z2) / len(z2)

    close(mlp(params), math.log(2), "MLP forward")
    gradient_check("05 full MLP", mlp, params, {
        "X": [[-1.0, 0.5]], "W1": [[-0.5, 0.5], [-1.0, 1.0]],
        "b1": [-0.5, 0.5], "W2": [[-0.5, 0.5], [-0.5, 0.5]],
        "b2": [-0.5, 0.5],
    })
    duplicate = copy.deepcopy(params)
    duplicate["X"] *= 2
    close(mlp(duplicate), mlp(params), "mean loss batch replication")
    eps = 1e-6
    close((max(0, eps) - max(0, -eps)) / (2 * eps), 0.5, "ReLU kink")


def norm_forward(x, gamma, beta, epsilon, centered):
    mean = sum(x) / len(x) if centered else 0.0
    residual = [v - mean for v in x]
    radius = math.sqrt(dot(residual, residual) / len(x) + epsilon)
    normalized = [v / radius for v in residual]
    return [g * v + b for g, v, b in zip(gamma, normalized, beta)], normalized, radius


def norm_backward(x, gamma, upstream, epsilon, centered):
    _, normalized, radius = norm_forward(x, gamma, [0.0] * len(x), epsilon, centered)
    u = [g * a for g, a in zip(gamma, upstream)]
    average = sum(u) / len(x) if centered else 0.0
    correlation = dot(u, normalized) / len(x)
    return {
        "x": [(v - average - h * correlation) / radius for v, h in zip(u, normalized)],
        "gamma": [a * h for a, h in zip(upstream, normalized)],
        "beta": list(upstream),
    }


def check_optimization_and_norms():
    # 06/derivation, math-initialization, math-normalization, math-dropout-clipping.
    m, v = 0.1 * 2, 0.001 * 4
    close([m, v, m / 0.1, v / 0.001], [0.2, 0.004, 2, 4], "Adam first moments")
    close(2 * (1 - 0.1 * 0.1) - 0.1, 1.88, "AdamW")
    g_l2 = 2 + 0.1 * 2
    close(2 - 0.1 * g_l2 / math.sqrt(g_l2 ** 2), 1.9, "Adam plus L2")
    momentum = [0.0, 0.0]
    for gradient in ([2, 10], [2, -8]):
        momentum = [0.9 * old + 0.1 * new for old, new in zip(momentum, gradient)]
    close(momentum, [0.38, 0.1], "momentum example")
    close([math.sqrt(1 / 256), math.sqrt(2 / 256)],
          [0.0625, 0.08838834764831845], "Xavier/He std")
    group = [1.0, 3.0]
    group_mean = sum(group) / len(group)
    unbiased_variance = sum((value - group_mean) ** 2 for value in group) / (len(group) - 1)
    close([0.9 * 0 + 0.1 * group_mean, 0.9 * 1 + 0.1 * unbiased_variance],
          [0.2, 1.1], "BN running statistics")
    q, x = 0.75, 2.0
    mean = q * (x / q)
    variance = q * (x / q - mean) ** 2 + (1 - q) * mean ** 2
    close([mean, variance], [2, 4 / 3], "dropout moments")
    close([g * 2 / math.hypot(3, 4) for g in (3, 4)], [1.2, 1.6], "global clipping")

    for centered, name in ((True, "06 LN"), (False, "10 RMSNorm")):
        params = {"x": [1.0, -2.0, 0.5], "gamma": [1.2, -0.7, 0.9],
                  "beta": [0.1, -0.2, 0.3]}
        upstream = [0.4, -1.0, 2.0]
        for epsilon in (0.0, 1e-5):
            gradient_check(
                f"{name} eps={epsilon}",
                lambda v: dot(upstream, norm_forward(
                    v["x"], v["gamma"], v["beta"], epsilon, centered)[0]),
                params, norm_backward(params["x"], params["gamma"], upstream, epsilon, centered),
            )
    ln = norm_backward([1, 2, 3], [1, 1, 1], [1, 0, 0], 0, True)["x"]
    close(ln, [math.sqrt(1.5) / 6, -math.sqrt(1.5) / 3, math.sqrt(1.5) / 6],
          "LN worked example")
    rms = norm_backward([1, 2], [1, 1], [1, 0], 0, False)["x"]
    close(rms, [0.8 / math.sqrt(2.5), -0.4 / math.sqrt(2.5)], "RMS example")
    close(dot([1, 2], rms), 0, "RMS radial invariance")
    zero_params = {"x": [0.0, 0.0], "gamma": [1.0, 2.0], "beta": [0.0, 0.0]}
    gradient_check("10 RMSNorm zero input", lambda v: sum(norm_forward(
        v["x"], v["gamma"], v["beta"], 1e-5, False)[0]), zero_params,
        norm_backward([0, 0], [1, 2], [1, 1], 1e-5, False))


def check_sequences():
    # 07/math-convolution, derivation, math-lstm, math-gru-causality.
    def conv(v):
        y = [sum(v["k"][a] * v["x"][t + a] for a in range(2)) + v["b"][0]
             for t in range(2)]
        return dot(y, [1, 2])

    gradient_check("07 convolution overlap", conv,
                   {"x": [1.0, 2.0, 3.0], "k": [2.0, -1.0], "b": [0.0]},
                   {"x": [2.0, 3.0, -2.0], "k": [5.0, 8.0], "b": [3.0]})
    close((32 + 2 - 3) // 2 + 1, 16, "CNN output")
    close(16 * (3 * 9 + 1), 448, "CNN parameters")
    close(3 + (3 - 1) * 2, 7, "CNN receptive field")

    def recurrent(v):
        h = 0.0
        for token in (1, 0, 2):
            h = v["w"][0] * h + token
        return h

    gradient_check("07 RNN shared BPTT", recurrent, {"w": [0.5]}, {"w": [1.0]})
    close(recurrent({"w": [0.5]}), 2.25, "RNN forward")
    close([math.tanh(1) / 2, (1 - math.tanh(1) ** 2) / 4],
          [0.3807970779778824, 0.10499358540350653], "LSTM state and direct gradient")
    close(0.99 ** 1000, 4.317124741065786e-5, "LSTM long direct path")
    gradient_check("07 LSTM direct cell", lambda v: math.tanh(0.5 * v["c"][0]) / 2,
                   {"c": [2.0]}, {"c": [(1 - math.tanh(1) ** 2) / 4]})
    close(0.75 * 2 + 0.25 * math.tanh(1), 1.690398538988941, "GRU state")
    gradient_check("07 GRU fixed gates", lambda v: 0.75 * v["h"][0] + 0.25 * math.tanh(
        0.5 * v["h"][0]), {"h": [2.0]},
        {"h": [0.75 + 0.125 * (1 - math.tanh(1) ** 2)]})


def pair_counts(corpus):
    counts = Counter()
    for symbols, frequency in corpus:
        for pair in zip(symbols, symbols[1:]):
            counts[pair] += frequency
    return counts


def merge_pair(symbols, pair):
    output, index = [], 0
    while index < len(symbols):
        if tuple(symbols[index:index + 2]) == pair:
            output.append("".join(pair))
            index += 2
        else:
            output.append(symbols[index])
            index += 1
    return output


def check_tokens():
    # 08/example, all four math sections.
    corpus = [(list(word) + ["</w>"], frequency)
              for word, frequency in (("low", 5), ("lower", 2), ("new", 6), ("newer", 3))]
    counts = pair_counts(corpus)
    assert counts.most_common(1)[0] == (("w", "</w>"), 11)
    corpus = [(merge_pair(tokens, ("w", "</w>")), frequency) for tokens, frequency in corpus]
    assert pair_counts(corpus).most_common(1)[0] == (("n", "e"), 9)
    close([counts[("e", "w")], counts[("w", "</w>")]], [9, 11], "BPE first counts")
    marginal = 0.2 + 0.4 * 0.4
    posterior = [0.16 / marginal, 0.2 / marginal]
    expected_counts = [posterior[0], posterior[0], posterior[1]]
    close(marginal, 0.36, "Unigram marginal")
    close([n / sum(expected_counts) for n in expected_counts], [4 / 13, 4 / 13, 5 / 13],
          "Unigram EM update")
    embedding_gradient = [[0.0, 0.0] for _ in range(3)]
    for token, gradient in zip([1, 1, 2], [[1, 2], [3, -1], [0, 4]]):
        for j, value in enumerate(gradient):
            embedding_gradient[token][j] += value
    output_gradient = [[prob * h for h in [2, -1]] for prob in [0.5, -0.75, 0.25]]
    total = [[a + b for a, b in zip(left, right)]
             for left, right in zip(embedding_gradient, output_gradient)]
    close(total, [[1, -0.5], [2.5, 1.75], [0.5, 3.75]], "tied embedding gradient")
    z = [math.log(4), 0.0]
    close(softmax(z), [0.8, 0.2], "T=1")
    close(softmax([value / 2 for value in z]), [2 / 3, 1 / 3], "T=2")
    gradient_check("08 temperature CE", lambda v: cross_entropy(
        [value / 2 for value in v["z"]], [0, 1]),
        {"z": z}, {"z": [1 / 3, -1 / 3]})
    probabilities, mask = [0.5, 0.25, 0.01], [1, 1, 0]
    nll = -sum(keep * math.log(p) for p, keep in zip(probabilities, mask))
    close([nll / sum(mask), math.exp(nll / sum(mask)), math.exp(nll / 3)],
          [1.0397207708399179, math.sqrt(8), 2], "masked NLL/PPL")
    close(math.exp(7 * math.log(2) / 4), 3.363585661014858, "corpus token PPL")


def attention_forward(params, mask=None):
    q, k, v = params["Q"], params["K"], params["V"]
    scores = scale(mm(q, transpose(k)), 1 / math.sqrt(len(q[0])))
    weights = [softmax(row, None if mask is None else mask[i])
               for i, row in enumerate(scores)]
    return mm(weights, v), weights


def attention_backward(params, upstream, mask=None):
    _, weights = attention_forward(params, mask)
    ga = mm(upstream, transpose(params["V"]))
    gs = [[p * (g - dot(row_p, row_g)) for p, g in zip(row_p, row_g)]
          for row_p, row_g in zip(weights, ga)]
    factor = 1 / math.sqrt(len(params["Q"][0]))
    return {"Q": scale(mm(gs, params["K"]), factor),
            "K": scale(mm(transpose(gs), params["Q"]), factor),
            "V": mm(transpose(weights), upstream)}


def check_attention_and_architecture():
    # 09/math-attention-backward includes this exact numeric fixture.
    params = {"Q": [[1.0, 0.0]], "K": [[0.0, 0.0], [math.sqrt(2) * math.log(3), 0.0]],
              "V": [[2.0, 0.0], [0.0, 4.0]]}
    upstream = [[1.0, 2.0]]
    output, weights = attention_forward(params)
    close(weights, [[0.25, 0.75]], "attention weights")
    close(output, [[0.5, 3.0]], "attention output")
    analytic = attention_backward(params, upstream)
    close(analytic["Q"], [[9 * math.log(3) / 8, 0]], "attention dQ example")
    close(analytic["K"], [[-9 / (8 * math.sqrt(2)), 0], [9 / (8 * math.sqrt(2)), 0]],
          "attention dK example")
    close(analytic["V"], [[0.25, 0.5], [0.75, 1.5]], "attention dV example")
    gradient_check("09 attention worked Q/K/V", lambda v: dot(flat(upstream), flat(
        attention_forward(v)[0])), params, analytic)
    # Rectangular cross-attention, d_k != d_v, causal/padding exclusions.
    params = {"Q": [[0.2, -0.3], [0.7, 0.1]],
              "K": [[0.1, 0.5], [-0.4, 0.2], [0.8, -0.7]],
              "V": [[1.0, -2.0, 0.5], [0.2, 1.0, -0.4], [-0.5, 0.3, 2.0]]}
    upstream = [[1.0, -0.7, 0.2], [0.4, 0.5, -0.3]]
    mask = [[True, False, False], [True, True, False]]
    analytic = attention_backward(params, upstream, mask)
    close(analytic["Q"][0], [0, 0], "singleton attention dQ")
    close(analytic["K"][2] + analytic["V"][2], [0] * 5, "masked key/value gradient")
    gradient_check("09 masked rectangular attention", lambda v: dot(flat(upstream), flat(
        attention_forward(v, mask)[0])), params, analytic)
    try:
        softmax([0, 0], [False, False])
    except ValueError:
        pass
    else:
        raise AssertionError("all-masked row must not silently become uniform")

    b, s, h, f = 1, 128, 512, 2048
    close([4 * h * h, 2 * h * f], [1048576, 2097152], "MHA/FFN parameters")
    flops = [8 * b * s * h * h, 4 * b * s * s * h, 4 * b * s * h * f]
    close(flops, [268435456, 33554432, 536870912], "Transformer FLOPs")
    close(sum(flops), 838860800, "Transformer total FLOPs")
    x, eps = [1, 2, 3], 1e-5
    for pre in (True, False):
        def block(shift):
            values = [value + shift for value in x]
            if pre:
                norm = norm_forward(values, [1] * 3, [0] * 3, 1e-5, True)[0]
                return [value + 0.1 * n for value, n in zip(values, norm)]
            return norm_forward([1.1 * value for value in values],
                                [1] * 3, [0] * 3, 1e-5, True)[0]
        direction = [(a - b) / (2 * eps) for a, b in zip(block(eps), block(-eps))]
        close(direction, [1 if pre else 0] * 3, "Pre/Post-LN shift", atol=1e-9)

    def rotate(vector, angle):
        c, s = math.cos(angle), math.sin(angle)
        return [c * vector[0] - s * vector[1], s * vector[0] + c * vector[1]]

    close(dot(rotate([1, 0], math.pi / 2), rotate([1, 0], math.pi)), 0, "RoPE example")
    q, k, m, n = [0.3, 1.2], [-0.7, 0.4], 0.8, 2.1
    close(dot(rotate(q, m), rotate(k, n)), dot(q, rotate(k, n - m)), "RoPE identity")
    close([2 * 12 * 48, 3 * 12 * 32], [1152, 1152], "SwiGLU parameter match")
    close(3 * 2 * sigmoid(0), 3, "SwiGLU gate gradient")
    close([2 * 32 * 128, 2 * 8 * 128, 2 * 128, 512 + 64],
          [8192, 2048, 256, 576], "MHA/GQA/MQA/MLA elements")
    close(0.01 * 4 * dot([1, 0, 0, 0], [0.7, 0.1, 0.1, 0.1]), 0.028, "MoE auxiliary")
    close(math.ceil(1.25 * 2 * 8 / 4), 5, "MoE capacity")
    logits = [math.log(0.7), math.log(0.1), math.log(0.1), math.log(0.1)]
    p, load = softmax(logits), [1, 0, 0, 0]
    gradient_check("10 MoE auxiliary fixed assignments",
                   lambda v: 0.01 * 4 * dot(load, softmax(v["z"])), {"z": logits},
                   {"z": [0.04 * p[j] * (load[j] - dot(load, p)) for j in range(4)]})


def online_attention(blocks):
    maximum, denominator, numerator = -math.inf, 0.0, None
    for scores, values in blocks:
        if not scores:
            continue
        new_max = max(maximum, max(scores))
        rescale = 0.0 if denominator == 0 else math.exp(maximum - new_max)
        if numerator is None:
            numerator = [0.0] * len(values[0])
        numerator = [rescale * value for value in numerator]
        denominator *= rescale
        for score, value in zip(scores, values):
            weight = math.exp(score - new_max)
            denominator += weight
            numerator = [old + weight * new for old, new in zip(numerator, value)]
        maximum = new_max
    if denominator == 0:
        raise ValueError("no valid key in online attention")
    return [value / denominator for value in numerator], (maximum, denominator, numerator)


def check_systems():
    # 11/math-memory-zero, math-flashattention-online, math-prefill-decode,
    # math-parallel-communication.
    p, g = 7e9, 8
    states = [16 * p, 4 * p + 12 * p / g, 2 * p + 14 * p / g, 16 * p / g]
    close([v / 1e9 for v in states], [112, 38.5, 26.25, 14], "ZeRO GB")
    close(2 * 1 * 32 * 4096 ** 2, 1024 ** 3, "dense attention 1 GiB")
    close(3 * 4096 * 4096 * 2 / 1024 ** 2, 96, "QKV MiB")
    kv = 2 * 32 * 4096 * 8 * 128 * 2
    close(kv, 536870912, "KV bytes")
    close(kv * 100 / 1024 ** 3, 50, "100 requests KV GiB")
    close((14e9 + kv) / 1e12 * 1000, 14.536870912, "decode bandwidth ms")
    blocks = [([math.log(2), 0], [[2], [4]]), ([math.log(3)], [[10]])]
    output, stats = online_attention(blocks)
    close(stats, [math.log(3), 2, [38 / 3]], "online sufficient statistics")
    close(output, [19 / 3], "online softmax example")
    close(online_attention(list(reversed(blocks)))[0], output, "online reordered blocks")
    shifted = [([s + 1000 for s in scores], values) for scores, values in blocks]
    close(online_attention(shifted)[0], output, "online stable shift")
    scores = [3.2, -1.0, 7.0, 0.5]
    values = [[1, 2], [-1, 3], [0.5, -0.2], [4, 1]]
    direct = mm([softmax(scores)], values)[0]
    streamed = online_attention([(scores[:1], values[:1]), ([], []),
                                 (scores[1:3], values[1:3]), (scores[3:], values[3:])])[0]
    close(streamed, direct, "online vector output")
    close(2 * (8 - 1) / 8, 1.75, "ring GiB per rank")
    close((14 * 5e-6 + 1.75 / 50) * 1000, 35.07, "ring time ms")
    close([8 / (8 + 4 - 1), 32 / (32 + 4 - 1)], [8 / 11, 32 / 35], "pipeline utilization")


def lora_forward(params, factor=2.0):
    x = [[value] for value in params["x"]]
    base = x  # W = identity; W is frozen but x remains differentiable.
    branch = mm(params["B"], mm(params["A"], x))
    return [row[0] + factor * delta[0] for row, delta in zip(base, branch)]


def lora_backward(params, upstream, factor=2.0):
    x = [[value] for value in params["x"]]
    g = [[value] for value in upstream]
    hidden = mm(params["A"], x)
    btg = mm(transpose(params["B"]), g)
    dx_branch = scale(mm(transpose(params["A"]), btg), factor)
    return {"A": scale(mm(btg, transpose(x)), factor),
            "B": scale(mm(g, transpose(hidden)), factor),
            "x": [old + row[0] for old, row in zip(upstream, dx_branch)]}


def check_lora_and_quantization():
    # 12/math-lora-gradients, math-rank-scale-merge, math-quantization, math-peft-memory.
    upstream = [3.0, -2.0]
    params = {"A": [[1.0, -1.0]], "B": [[0.5], [1.0]], "x": [2.0, 1.0]}
    close(lora_forward(params), [3, 3], "LoRA output")
    analytic = lora_backward(params, upstream)
    close(analytic["A"], [[-2, -1]], "LoRA dA example")
    close(analytic["B"], [[6], [-4]], "LoRA dB example")
    close(analytic["x"], [2, -1], "LoRA dx example")
    for label, a, b in (
        ("nonzero", [[1.0, -1.0]], [[0.5], [1.0]]),
        ("B zero", [[1.0, -1.0]], [[0.0], [0.0]]),
        ("A and B zero", [[0.0, 0.0]], [[0.0], [0.0]]),
    ):
        case = {"A": a, "B": b, "x": [2.0, 1.0]}
        gradient_check("12 LoRA " + label, lambda v: dot(upstream, lora_forward(v)),
                       case, lora_backward(case, upstream))
    merged = [[(i == j) + 2 * mm(params["B"], params["A"])[i][j]
               for j in range(2)] for i in range(2)]
    close(mm(merged, [[2], [1]]), [[3], [3]], "LoRA merged output")
    close([sum([1, -2, 0, -2]) * b * 2 for b in [0.5, 0, -0.5, 1]],
          [-3, 0, 3, -6], "original rank-one branch")
    weight = [-1.0, -0.2, 0.3, 1.0]
    step = max(abs(value) for value in weight) / 7
    codes = [min(7, max(-7, round(value / step))) for value in weight]
    decoded = [code * step for code in codes]
    close(codes, [-7, -1, 2, 7], "uniform 4-bit codes (not NF4)")
    error = max(abs(a - b) for a, b in zip(decoded, weight))
    close(error, 2 / 35, "quantization maximum error")
    assert error <= step / 2
    close([sum(weight), sum(decoded)], [0.1, 1 / 7], "quantized dot product")
    trainable = 32 * 2 * 16 * (4096 + 4096)
    close(trainable, 8388608, "LoRA target parameter count")
    close(trainable * 16 / 1024 ** 2, 128, "LoRA state MiB")
    bits = 4 + 8 / 64 + 32 / (64 * 256)
    close(bits, 4.126953125, "double quantization illustrative bits")
    close(7e9 * bits / 8 / 1e9, 3.611083984375, "illustrative quantized GB")


def main():
    check_neural_networks()
    check_optimization_and_norms()
    check_sequences()
    check_tokens()
    check_attention_and_architecture()
    check_systems()
    check_lora_and_quantization()
    for name, coordinates, error in GRADIENT_REPORTS:
        print(f"PASS {name}: {coordinates} coordinates, max absolute error {error:.3e}")
    print(f"PASS {CHECKS} checks; {sum(n for _, n, _ in GRADIENT_REPORTS)} "
          "finite-difference coordinates; chapters 05-12.")


if __name__ == "__main__":
    main()
