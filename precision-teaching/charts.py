"""Celeration charts for Precision Teaching — Plotly-based semi-log progress charts."""

import plotly.graph_objects as go
from datetime import datetime


def celeration_chart(probes, aim, skill_name, pupil_name):
    """Generate a celeration chart (semi-log) for a pupil's probe history."""
    dates = [datetime.strptime(p["date"], "%Y-%m-%d") for p in probes]
    correct_per_min = []
    errors_per_min = []

    for p in probes:
        if p["mode"] == "timed" and p.get("durationSec", 0) > 0:
            duration_min = p["durationSec"] / 60
            cpm = p["correct"] / duration_min
            epm = p["errors"] / duration_min
            correct_per_min.append(round(cpm, 1))
            errors_per_min.append(round(epm, 1))
        else:
            correct_per_min.append(None)
            errors_per_min.append(None)

    fig = go.Figure()

    timed_dates = [d for d, c in zip(dates, correct_per_min) if c is not None]
    timed_cpm = [c for c in correct_per_min if c is not None]

    if timed_dates:
        fig.add_trace(go.Scatter(
            x=timed_dates, y=timed_cpm,
            mode="lines+markers", name="Correct/min",
            line=dict(color="#1798d3", width=2),
            marker=dict(size=8),
        ))

    timed_err_dates = [d for d, e in zip(dates, errors_per_min) if e is not None and e > 0]
    timed_epm = [e for e in errors_per_min if e is not None and e > 0]

    if timed_err_dates:
        fig.add_trace(go.Scatter(
            x=timed_err_dates, y=timed_epm,
            mode="lines+markers", name="Errors/min",
            line=dict(color="#E53935", width=2, dash="dot"),
            marker=dict(size=8, symbol="x"),
        ))

    aim_cpm = aim.get("correctPerMin", 40)
    fig.add_hline(
        y=aim_cpm, line_dash="dash", line_color="#43A047",
        annotation_text=f"Aim: {aim_cpm}/min",
        annotation_position="top left",
    )

    celeration = _calc_celeration(timed_dates, timed_cpm)
    if celeration:
        start_day = (timed_dates[0] - timed_dates[0]).days
        end_day = (timed_dates[-1] - timed_dates[0]).days
        start_val = timed_cpm[0]
        end_val = start_val * (celeration ** ((end_day - start_day) / 7))
        fig.add_trace(go.Scatter(
            x=[timed_dates[0], timed_dates[-1]],
            y=[max(start_val, 1), max(end_val, 1)],
            mode="lines", name=f"Celeration: ×{celeration:.1f}/week",
            line=dict(color="#FF9800", width=2, dash="dashdot"),
        ))

    untimed_dates = [d for d, c, p in zip(dates, correct_per_min, probes) if p["mode"] == "untimed"]
    if untimed_dates:
        untimed_accuracy = []
        untimed_plot_dates = []
        for p in probes:
            if p["mode"] == "untimed":
                total = p["correct"] + p["errors"]
                acc = round(p["correct"] / total * 100, 1) if total > 0 else 0
                untimed_accuracy.append(acc)
                untimed_plot_dates.append(datetime.strptime(p["date"], "%Y-%m-%d"))

        if untimed_plot_dates:
            fig.add_trace(go.Scatter(
                x=untimed_plot_dates, y=untimed_accuracy,
                mode="markers", name="Untimed accuracy %",
                marker=dict(size=10, symbol="diamond", color="#9C27B0"),
            ))

    fig.update_layout(
        title=f"{pupil_name} — {skill_name}",
        yaxis_title="Correct per minute (log scale)",
        yaxis_type="log",
        xaxis_title="Date",
        template="plotly_white",
        height=500,
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
    )

    return fig


def _calc_celeration(dates, values):
    """Calculate celeration (weekly fold-change) from probe data."""
    if not dates or len(dates) < 2 or not values:
        return None
    try:
        import numpy as np
        day_indices = [(d - dates[0]).days for d in dates]
        log_vals = [0 if v <= 0 else float(np.log10(v)) for v in values]
        valid = [(d, v) for d, v in zip(day_indices, log_vals)]
        if len(valid) < 2:
            return None
        days = [d for d, v in valid]
        logs = [v for d, v in valid]
        slope, _ = np.polyfit(days, logs, 1)
        return float(10 ** (slope * 7))
    except ImportError:
        return None