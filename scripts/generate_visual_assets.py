from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WEB_ASSETS = ROOT / "web" / "assets" / "ui-art"
DESIGN_ASSETS = ROOT / "design" / "approved-uiux-v1" / "assets-spec"

PALE = "#fbfaf6"
INK = "#18382f"
GOLD = "#a79263"


def write_asset(name: str, content: str) -> None:
    for base in (WEB_ASSETS, DESIGN_ASSETS):
        base.mkdir(parents=True, exist_ok=True)
        (base / name).write_text(content, encoding="utf-8")


def style_defs() -> str:
    return f"""
    <style>
      .ink {{ stroke: {INK}; stroke-width: 7; stroke-linecap: round; stroke-linejoin: round; fill: none; }}
      .thin {{ stroke: {INK}; stroke-width: 5; stroke-linecap: round; stroke-linejoin: round; fill: none; }}
      .soft {{ stroke: {GOLD}; stroke-width: 5; stroke-linecap: round; stroke-linejoin: round; fill: none; }}
      .hair {{ stroke: {GOLD}; stroke-width: 3.5; stroke-linecap: round; stroke-linejoin: round; fill: none; opacity: .82; }}
      .paper {{ fill: #fffdf6; }}
      .paper-stroke {{ fill: #fffdf6; stroke: {INK}; stroke-width: 7; stroke-linecap: round; stroke-linejoin: round; }}
      .soft-paper {{ fill: #fffdf6; stroke: {GOLD}; stroke-width: 5; stroke-linecap: round; stroke-linejoin: round; }}
      .ink-fill {{ fill: {INK}; }}
    </style>
    """


def badge_shell(asset_id: str, colors: tuple[str, str, str], body: str) -> str:
    c1, c2, c3 = colors
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256" fill="none">
  <defs>
    <radialGradient id="{asset_id}-field" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(122 82) rotate(42) scale(132 140)">
      <stop stop-color="#fffdf2"/>
      <stop offset=".25" stop-color="{c1}"/>
      <stop offset=".66" stop-color="{c2}"/>
      <stop offset="1" stop-color="{c3}"/>
    </radialGradient>
    <radialGradient id="{asset_id}-inner" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(128 128) scale(78)">
      <stop stop-color="#fffdf6"/>
      <stop offset=".66" stop-color="#fffdf6" stop-opacity=".9"/>
      <stop offset="1" stop-color="#fffdf6" stop-opacity=".36"/>
    </radialGradient>
    <filter id="{asset_id}-shadow" x="20" y="16" width="216" height="224" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="15" stdDeviation="15" flood-color="#33423d" flood-opacity=".18"/>
    </filter>
    {style_defs()}
  </defs>
  <circle cx="128" cy="128" r="116" fill="{PALE}"/>
  <g filter="url(#{asset_id}-shadow)">
    <path d="M128 27 203 71v87l-75 75-75-75V71Z" fill="url(#{asset_id}-field)" stroke="{c3}" stroke-width="7" stroke-linejoin="round"/>
    <circle cx="128" cy="128" r="73" fill="url(#{asset_id}-inner)" opacity=".86"/>
    <circle cx="128" cy="128" r="61" fill="#fffdf6" opacity=".26"/>
    <g transform="translate(128 128)">
      {body}
    </g>
  </g>
</svg>
'''


def tag_shell(asset_id: str, colors: tuple[str, str, str], body: str) -> str:
    c1, c2, c3 = colors
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220" fill="none">
  <defs>
    <radialGradient id="{asset_id}-field" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(105 76) rotate(42) scale(108 114)">
      <stop stop-color="#fffdf2"/>
      <stop offset=".28" stop-color="{c1}"/>
      <stop offset=".66" stop-color="{c2}"/>
      <stop offset="1" stop-color="{c3}"/>
    </radialGradient>
    <radialGradient id="{asset_id}-inner" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(110 110) scale(58)">
      <stop stop-color="#fffdf6"/>
      <stop offset=".7" stop-color="#fffdf6" stop-opacity=".9"/>
      <stop offset="1" stop-color="#fffdf6" stop-opacity=".34"/>
    </radialGradient>
    <filter id="{asset_id}-shadow" x="18" y="16" width="184" height="188" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="12" stdDeviation="12" flood-color="#2e3b37" flood-opacity=".16"/>
    </filter>
    {style_defs()}
  </defs>
  <circle cx="110" cy="110" r="100" fill="{PALE}"/>
  <g filter="url(#{asset_id}-shadow)">
    <path d="M110 28 137 47l33 4 7 31 21 24-13 29 1 32-31 10-22 25-33-8-33 8-22-25-31-10 1-32-13-29 21-24 7-31 33-4Z" fill="url(#{asset_id}-field)" stroke="{c3}" stroke-width="5" stroke-linejoin="round"/>
    <circle cx="110" cy="110" r="61" fill="url(#{asset_id}-inner)" opacity=".86"/>
    <circle cx="110" cy="110" r="48" fill="#fffdf6" opacity=".26"/>
    <g transform="translate(110 110)">
      {body}
    </g>
  </g>
</svg>
'''


BADGE_BODIES = {
    "human-concentrate": '''
      <path d="M0 -60 13 -22 51 0 13 22 0 60-13 22-51 0-13-22Z" class="paper" opacity=".72" stroke="#fffdf6" stroke-width="5" stroke-linejoin="round"/>
      <circle cx="0" cy="-15" r="18" class="ink-fill" opacity=".86"/>
      <path d="M-34 45c9-29 27-43 34-43s25 14 34 43Z" class="ink-fill" opacity=".86"/>
      <path class="hair" d="M-38 22c24 14 52 14 76 0"/>
    ''',
    "key-human": '''
      <circle cx="-13" cy="-17" r="18" class="ink-fill" opacity=".86"/>
      <path d="M-45 44c9-29 26-42 32-42s23 13 32 42Z" class="ink-fill" opacity=".86"/>
      <path class="ink" d="M6 -4h60"/>
      <path class="thin" d="M43 -4v22M58 -4v14"/>
      <path class="hair" d="M-43 23c27 15 59 15 86 0"/>
    ''',
    "high-distill": '''
      <path class="ink" d="M-17 -60h34M-9 -60v42l-31 50c-9 15 2 33 19 33h42c17 0 28-18 19-33L9 -18v-42"/>
      <path class="hair" d="M-27 28c18 11 36 11 54 0"/>
      <path class="thin" d="M-14 45c9 6 19 6 28 0"/>
      <path class="soft" d="M36 -4c16 6 25 18 28 32"/>
      <circle cx="0" cy="36" r="16" class="ink-fill" opacity=".13"/>
    ''',
    "signature-growing": '''
      <path class="ink" d="M-35 58c17-55 48-90 82-112"/>
      <path d="M-43 -22c18-8 35-2 45 14-18 8-35 2-45-14Z" class="paper-stroke"/>
      <path d="M4 25c17-16 36-19 55-8-17 16-36 19-55 8Z" class="paper-stroke"/>
      <path class="hair" d="M-47 36c28 20 70 18 94-12"/>
    ''',
    "half-distilled": '''
      <circle cx="0" cy="0" r="58" class="paper-stroke" opacity=".9"/>
      <path d="M0 -58A58 58 0 0 1 0 58Z" fill="#18382f" opacity=".14"/>
      <path class="ink" d="M0 -58v116"/>
      <circle cx="-25" cy="-10" r="16" class="ink-fill" opacity=".8"/>
      <path d="M-51 42c8-24 22-35 26-35s18 11 26 35Z" class="ink-fill" opacity=".8"/>
      <path class="thin" d="M22 -25h29M22 0h36M22 25h25"/>
    ''',
    "collab-distillable": '''
      <circle cx="-29" cy="-18" r="17" class="paper-stroke"/>
      <circle cx="29" cy="-18" r="17" class="paper-stroke"/>
      <path class="ink" d="M-60 47c8-28 25-41 31-41s23 13 31 41M2 47c8-28 25-41 31-41s23 13 31 41"/>
      <path class="hair" d="M-9 -35c8-7 18-7 26 0M-15 21c12 7 30 7 45 0"/>
    ''',
    "process-friendly": '''
      <rect x="-47" y="-56" width="54" height="34" rx="7" class="paper-stroke"/>
      <rect x="-27" y="-17" width="54" height="34" rx="7" class="paper-stroke"/>
      <rect x="-7" y="22" width="54" height="34" rx="7" class="paper-stroke"/>
      <path class="soft" d="M7 -39h18v22M27 0h18v22M-25 39h18"/>
      <circle cx="-25" cy="-39" r="5" class="ink-fill"/>
      <circle cx="0" cy="0" r="5" class="ink-fill"/>
      <circle cx="25" cy="39" r="5" class="ink-fill"/>
    ''',
    "quality-material": '''
      <path d="M0 -58 45 -32v54L0 58-45 22v-54Z" class="paper-stroke" stroke-linejoin="round"/>
      <path class="ink" d="M-45 -32 0 -6 45 -32M0 -6v64M-45 22 0 -6 45 22"/>
      <path class="hair" d="M-26 31c16 10 36 10 52 0"/>
    ''',
}


TAG_BODIES = {
    "teachable-irreplaceable": '''
      <path d="M-43 -34h40c14 0 24 10 24 24v40h-41c-14 0-23-10-23-23Z" class="paper-stroke"/>
      <path class="ink" d="M-13 -34v-17h41v81M-14 -5h34M1 15h17"/>
      <path class="soft" d="M30 18v18M21 36h18"/>
    ''',
    "intuition-grounded": '''
      <circle cx="0" cy="0" r="51" class="paper-stroke"/>
      <path class="hair" d="M0 -52v14M0 38v14M-52 0h14M38 0h14"/>
      <path d="M-22 29-6-24 29-43 12 12Z" class="paper-stroke" stroke-linejoin="round"/>
      <circle cx="0" cy="0" r="5" class="ink-fill"/>
    ''',
    "boundary": '''
      <path d="M0 -52 45 -26v52L0 52-45 26v-52Z" class="paper-stroke" stroke-linejoin="round"/>
      <path class="thin" d="M0 -52v104M-45 -26 0 0 45 -26M-45 26 0 0 45 26"/>
      <circle cx="0" cy="0" r="7" class="ink-fill"/>
    ''',
    "empty-professional-detector": '''
      <path d="M-35 -48h56l22 22v72h-78Z" class="paper-stroke" stroke-linejoin="round"/>
      <path class="thin" d="M21 -48v22h22M-16 -18h30M-16 2h18"/>
      <circle cx="-7" cy="12" r="24" fill="none" stroke="#18382f" stroke-width="7"/>
      <path class="ink" d="M10 29l28 28"/>
    ''',
    "generative-reframer": '''
      <rect x="-51" y="-45" width="55" height="42" rx="7" class="paper-stroke"/>
      <rect x="-4" y="-3" width="55" height="45" rx="7" class="paper-stroke"/>
      <path class="thin" d="M-33 -20h24M12 18h26"/>
      <path class="soft" d="M-31 48c24 12 50 3 66-19M28 29l9 1-4 9"/>
    ''',
    "ai-amplified": '''
      <circle cx="-33" cy="0" r="20" class="paper-stroke"/>
      <path class="hair" d="M-33 -28v-18M-33 28v18M-53 0h-15M-13 0h21"/>
      <rect x="18" y="-45" width="32" height="32" rx="6" class="paper-stroke"/>
      <rect x="18" y="13" width="32" height="32" rx="6" class="paper-stroke"/>
      <path class="soft" d="M34 -13v26M8 31h-21"/>
    ''',
    "value-guardrail": '''
      <path d="M0 -53 48 -33v36c0 31-20 54-48 70-28-16-48-39-48-70v-36Z" class="paper-stroke" stroke-linejoin="round"/>
      <path class="ink" d="M-25 4-5 24 32 -28"/>
      <path class="hair" d="M-38 45h76"/>
    ''',
    "taste-low-expression": '''
      <path d="M-55 -3s21-34 55-34S55-3 55-3 34 31 0 31-55-34-55-34Z" class="paper-stroke"/>
      <circle cx="0" cy="-3" r="16" class="ink-fill"/>
      <path class="hair" d="M-35 50h42M19 50h6M36 50h6"/>
    ''',
    "fake-resistance": '''
      <path d="M-33 -48c-18 13-27 33-22 55 7 30 32 47 55 50 23-3 48-20 55-50 5-22-4-42-22-55-13-8-25-3-33 8-8-11-20-16-33-8Z" class="paper-stroke" stroke-linejoin="round"/>
      <path class="ink" d="M0 -38-10 -8 4 5-13 34M-25 -1h1M25 -1h1"/>
      <path class="hair" d="M-36 41c23-12 49-12 72 0"/>
    ''',
    "latent-human-variable": '''
      <circle cx="0" cy="0" r="51" class="paper-stroke"/>
      <path class="hair" d="M0 -27v-25M0 27v25M-27 0h-25M27 0h25"/>
      <circle cx="0" cy="0" r="17" class="ink-fill" opacity=".82"/>
      <path d="M0 -36 8 -17 28 -15 13 -1 16 19 0 8-16 19-13 -1-28 -15-8 -17Z" class="paper" opacity=".58"/>
    ''',
    "skill-friendly": '''
      <rect x="-42" y="-42" width="35" height="35" rx="7" class="paper-stroke"/>
      <rect x="7" y="-42" width="35" height="35" rx="7" class="paper-stroke"/>
      <rect x="-42" y="7" width="35" height="35" rx="7" class="paper-stroke"/>
      <rect x="7" y="7" width="35" height="35" rx="7" class="paper-stroke"/>
      <path class="hair" d="M-24 -7v14M24 -7v14M-7 -24h14M-7 24h14"/>
    ''',
    "method-distilled": '''
      <rect x="-38" y="-48" width="76" height="74" rx="7" class="paper-stroke"/>
      <path class="thin" d="M-22 -27h38M-22 -7h44M-22 13h28"/>
      <path class="soft" d="M-16 39c11-8 21-8 32 0"/>
      <path d="M0 28c12 8 20 18 20 29 0 10-8 17-20 17s-20-7-20-17c0-11 8-21 20-29Z" class="paper-stroke" stroke-width="6"/>
    ''',
    "high-density-human": '''
      <circle cx="0" cy="-25" r="20" class="ink-fill" opacity=".86"/>
      <path d="M-42 42c10-31 32-47 42-47s32 16 42 47Z" class="ink-fill" opacity=".86"/>
      <path d="M0 -63 8 -44 29 -42 14 -27 17 -6 0 -17-17 -6-14 -27-29 -42-8 -44Z" class="paper" stroke="#fffdf6" stroke-width="4" stroke-linejoin="round"/>
      <path class="hair" d="M-42 14c26 17 58 17 84 0"/>
    ''',
    "grounded-experience": '''
      <circle cx="0" cy="0" r="51" class="paper-stroke"/>
      <circle cx="0" cy="0" r="32" fill="none" stroke="#a79263" stroke-width="5"/>
      <circle cx="0" cy="0" r="15" fill="none" stroke="#18382f" stroke-width="6"/>
      <path class="hair" d="M-35 40c20 11 50 11 70 0M-35 -40c20-11 50-11 70 0"/>
    ''',
    "context-reader": '''
      <path d="M-56 -1c28-31 70-41 112-18-23 43-65 54-112 18Z" class="paper-stroke" stroke-linejoin="round"/>
      <circle cx="-3" cy="-6" r="17" class="ink-fill"/>
      <path class="hair" d="M-35 45c22 8 48 8 70 0"/>
      <circle cx="-46" cy="-38" r="5" class="ink-fill"/>
      <circle cx="46" cy="-35" r="5" class="ink-fill"/>
      <path class="thin" d="M-43 -34-31 -24M43 -31 29 -22"/>
    ''',
    "expressive-high": '''
      <rect x="-51" y="-43" width="58" height="45" rx="8" class="paper-stroke"/>
      <rect x="-3" y="2" width="58" height="45" rx="8" class="paper-stroke"/>
      <path class="thin" d="M-32 -16h25M13 24h25M-24 -30h16"/>
      <path class="soft" d="M-31 39c23 7 44-3 57-23M19 16l10 1-5 9"/>
    ''',
    "expressive-low": '''
      <path d="M-54 -28h72c15 0 27 12 27 27S33 26 18 26h-72Z" class="paper-stroke"/>
      <path class="ink" d="M-54 0h52M-21 -18-2 0-21 18"/>
      <path class="hair" d="M34 -33 48 -47M45 -12l19-4M45 13l19 4"/>
    ''',
    "relationship-stabilizer": '''
      <circle cx="0" cy="0" r="51" class="paper-stroke"/>
      <path class="ink" d="M0 -40v80M-28 -17 0 -36 28 -17M-28 18 0 36 28 18"/>
      <path class="hair" d="M-52 0h16M36 0h16M0 -52v16M0 36v16"/>
      <circle cx="0" cy="0" r="8" class="ink-fill"/>
    ''',
    "experience-locked": '''
      <circle cx="0" cy="15" r="43" class="paper-stroke"/>
      <path class="ink" d="M-27 -2v-20c0-19 12-32 27-32s27 13 27 32v20M-14 15h28M0 15v23"/>
      <path class="hair" d="M-31 44c20 9 42 9 62 0M-22 60c15 6 29 6 44 0"/>
    ''',
    "execution": '''
      <circle cx="0" cy="0" r="51" class="paper-stroke"/>
      <path class="ink" d="M-26 2-5 23 35 -31"/>
      <path class="hair" d="M0 -52v16M0 36v16M-52 0h16M36 0h16"/>
    ''',
    "aesthetic": '''
      <path d="M-55 -3s21-34 55-34S55-3 55-3 34 31 0 31-55-3-55-3Z" class="paper-stroke"/>
      <circle cx="0" cy="-3" r="16" class="ink-fill"/>
      <path d="M0 -58 6 -44 21 -42 10 -31 12 -16 0 -24-12 -16-10 -31-21 -42-6 -44Z" class="paper" stroke="#fffdf6" stroke-width="3"/>
    ''',
    "reconstruction": '''
      <path d="M0 -50 40 -27v47L0 50-40 20v-47Z" class="paper-stroke" stroke-linejoin="round"/>
      <path class="ink" d="M-40 -27 0 -4 40 -27M0 -4v54M-40 20 0 -4 40 20"/>
      <path class="hair" d="M-23 -39v-12M23 -39v-12M-50 0h-10M50 0h10"/>
    ''',
}


BADGES = {
    "badge-human-concentrate.svg": ("badge-human-concentrate", ("#ffc4a1", "#8b76d8", "#2f6f62"), BADGE_BODIES["human-concentrate"]),
    "badge-key-human.svg": ("badge-key-human", ("#ffe4a8", "#8f75d1", "#2f6f62"), BADGE_BODIES["key-human"]),
    "badge-high-distill.svg": ("badge-high-distill", ("#f3d38a", "#b68b45", "#6f5432"), BADGE_BODIES["high-distill"]),
    "badge-signature-growing.svg": ("badge-signature-growing", ("#d7eccf", "#75b193", "#286d57"), BADGE_BODIES["signature-growing"]),
    "badge-half-distilled.svg": ("badge-half-distilled", ("#d8c4f2", "#8c8e98", "#40535c"), BADGE_BODIES["half-distilled"]),
    "badge-collab-distillable.svg": ("badge-collab-distillable", ("#dbe9de", "#9caeaa", "#607168"), BADGE_BODIES["collab-distillable"]),
    "badge-process-friendly.svg": ("badge-process-friendly", ("#e9e6d8", "#9ba09e", "#5a6262"), BADGE_BODIES["process-friendly"]),
    "badge-quality-material.svg": ("badge-quality-material", ("#f0eee7", "#b5b7b4", "#686d70"), BADGE_BODIES["quality-material"]),
}


TAGS = {
    "tag-teachable-irreplaceable.svg": ("tag-teachable-irreplaceable", ("#e5d7b9", "#7db59f", "#2f6f5c"), TAG_BODIES["teachable-irreplaceable"]),
    "tag-intuition-grounded.svg": ("tag-intuition-grounded", ("#d8c59b", "#88a796", "#486a58"), TAG_BODIES["intuition-grounded"]),
    "tag-boundary.svg": ("tag-boundary", ("#d7d0ef", "#8a78c2", "#4d517e"), TAG_BODIES["boundary"]),
    "tag-empty-professional-detector.svg": ("tag-empty-professional-detector", ("#e8e5db", "#98aaa9", "#5f6668"), TAG_BODIES["empty-professional-detector"]),
    "tag-generative-reframer.svg": ("tag-generative-reframer", ("#d7c4f2", "#89b3c9", "#565fa6"), TAG_BODIES["generative-reframer"]),
    "tag-ai-amplified.svg": ("tag-ai-amplified", ("#c7eadf", "#8aa3db", "#386d73"), TAG_BODIES["ai-amplified"]),
    "tag-value-guardrail.svg": ("tag-value-guardrail", ("#f0d7b5", "#d08d77", "#765041"), TAG_BODIES["value-guardrail"]),
    "tag-taste-low-expression.svg": ("tag-taste-low-expression", ("#ead7e4", "#b195c8", "#665482"), TAG_BODIES["taste-low-expression"]),
    "tag-fake-resistance.svg": ("tag-fake-resistance", ("#e5d8d2", "#a48f91", "#6b5c60"), TAG_BODIES["fake-resistance"]),
    "tag-latent-human-variable.svg": ("tag-latent-human-variable", ("#e9e4c8", "#a3b78b", "#5f7256"), TAG_BODIES["latent-human-variable"]),
    "tag-skill-friendly.svg": ("tag-skill-friendly", ("#e4e6df", "#a0a7a3", "#5c6461"), TAG_BODIES["skill-friendly"]),
    "tag-method-distilled.svg": ("tag-method-distilled", ("#e9ddc2", "#9ab1a0", "#4d6b5c"), TAG_BODIES["method-distilled"]),
    "tag-high-density-human.svg": ("tag-high-density-human", ("#ffc4a1", "#8b76d8", "#2f6f62"), TAG_BODIES["high-density-human"]),
    "tag-grounded-experience.svg": ("tag-grounded-experience", ("#dfcaa2", "#a5a078", "#675a43"), TAG_BODIES["grounded-experience"]),
    "tag-context-reader.svg": ("tag-context-reader", ("#cde5df", "#78a99c", "#2d6d5b"), TAG_BODIES["context-reader"]),
    "tag-expressive-high.svg": ("tag-expressive-high", ("#d9d6f0", "#8db9d0", "#4d6f99"), TAG_BODIES["expressive-high"]),
    "tag-expressive-low.svg": ("tag-expressive-low", ("#e5d8d2", "#b49a8d", "#745f5a"), TAG_BODIES["expressive-low"]),
    "tag-relationship-stabilizer.svg": ("tag-relationship-stabilizer", ("#d7e9dd", "#8bb29d", "#4f725e"), TAG_BODIES["relationship-stabilizer"]),
    "tag-experience-locked.svg": ("tag-experience-locked", ("#e1ddd2", "#9f9b8e", "#61615d"), TAG_BODIES["experience-locked"]),
    "tag-execution.svg": ("tag-execution", ("#e4e6df", "#a0a7a3", "#5c6461"), TAG_BODIES["execution"]),
    "tag-aesthetic.svg": ("tag-aesthetic", ("#ead7e4", "#b195c8", "#665482"), TAG_BODIES["aesthetic"]),
    "tag-reconstruction.svg": ("tag-reconstruction", ("#d7c4f2", "#89b3c9", "#565fa6"), TAG_BODIES["reconstruction"]),
}


def generate_svgs() -> None:
    for filename, (asset_id, colors, body) in BADGES.items():
        write_asset(filename, badge_shell(asset_id, colors, body))

    for filename, (asset_id, colors, body) in TAGS.items():
        write_asset(filename, tag_shell(asset_id, colors, body))


if __name__ == "__main__":
    generate_svgs()
