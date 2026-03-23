from __future__ import annotations

import html
import json
import subprocess
from collections import defaultdict
from datetime import date
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / "content" / "profile.json").read_text(encoding="utf-8"))
TODAY = date.today().isoformat()
PRIMARY_NAME = DATA["identity"]["primary_name"]
ALTERNATE_NAME = DATA["identity"]["alternate_names"][0]


def h(value: str) -> str:
    return html.escape(str(value), quote=True)


def write_file(relative_path: str, content: str) -> None:
    destination = ROOT / relative_path
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(content.strip() + "\n", encoding="utf-8")


def is_external(url: str) -> bool:
    return url.startswith("http://") or url.startswith("https://")


def external_attrs(url: str) -> str:
    if url.startswith("mailto:"):
        return ""
    if is_external(url):
        return ' target="_blank" rel="noreferrer"'
    return ""


def render_button(label: str, url: str, variant: str = "primary") -> str:
    return (
        f'<a class="button button-{variant}" href="{h(url)}"{external_attrs(url)}>{h(label)}</a>'
    )


def other_public_name(display_name: str) -> str:
    return ALTERNATE_NAME if display_name == PRIMARY_NAME else PRIMARY_NAME


def find_entry(display_name: str) -> dict[str, str]:
    for entry in DATA["entry_points"]:
        if entry["display_name"] == display_name:
            return entry
    raise KeyError(display_name)


def resume_pdf_name(entry: dict[str, str]) -> str:
    return f"{entry['slug']}-resume.pdf"


def resume_pdf_href(entry: dict[str, str], prefix: str = "") -> str:
    return f"{prefix}assets/files/{resume_pdf_name(entry)}"


def resume_page_href(entry: dict[str, str], prefix: str = "") -> str:
    return f"{prefix}resume/{entry['slug']}/"


def cv_pdf_name(entry: dict[str, str]) -> str:
    return f"{entry['slug']}-cv.pdf"


def cv_pdf_href(entry: dict[str, str], prefix: str = "") -> str:
    return f"{prefix}assets/files/{cv_pdf_name(entry)}"


def cv_page_href(entry: dict[str, str], prefix: str = "") -> str:
    return f"{prefix}resume/cv/{entry['slug']}/"


# --- SVG icons for focus areas ---
FOCUS_ICONS = {
    "cloud": '<svg viewBox="0 0 24 24"><path d="M6.5 20a4.5 4.5 0 0 1-.42-8.98A7 7 0 0 1 19.5 10h.5a3.5 3.5 0 0 1 0 7H18"/><path d="M6.5 17h11"/></svg>',
    "brain": '<svg viewBox="0 0 24 24"><path d="M12 2a5 5 0 0 1 4.9 4H17a4 4 0 0 1 0 8h-1.1A5 5 0 0 1 12 18a5 5 0 0 1-3.9-4H7a4 4 0 0 1 0-8h.1A5 5 0 0 1 12 2z"/><path d="M12 2v16"/><path d="M8 6h8"/><path d="M9 10h6"/></svg>',
    "chart": '<svg viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="M7 16l4-8 4 4 4-8"/></svg>',
    "badge": '<svg viewBox="0 0 24 24"><path d="M12 15l-3.5 2 1-4-3-2.5h4L12 7l1.5 3.5h4L14.5 13l1 4z"/><circle cx="12" cy="12" r="10"/></svg>',
}


def render_focus_icon(icon_key: str) -> str:
    svg = FOCUS_ICONS.get(icon_key, "")
    if not svg:
        return ""
    return f'<div class="focus-icon">{svg}</div>'


def render_link_list() -> str:
    labels = ["LinkedIn", "GitHub", "Coursera", "Email"]
    links = [link for link in DATA["links"] if link["label"] in labels]
    items = []
    for link in links:
        items.append(
            f'<a class="link-pill" href="{h(link["url"])}"{external_attrs(link["url"])}>'
            f'<span>{h(link["label"])}</span>'
            f'<small>{h(link["description"])}</small>'
            f"</a>"
        )
    return "".join(items)


def render_profile_highlights() -> str:
    return "".join(
        f'<li class="highlight-item">{h(item)}</li>'
        for item in DATA["identity"]["profile_highlights"]
    )


def render_alias_cards(prefix: str, current_slug: str | None = None) -> str:
    cards = []
    for entry in DATA["entry_points"]:
        href = f"{prefix}{entry['slug']}/"
        is_current = current_slug == entry["slug"]
        card_class = "entry-card is-current" if is_current else "entry-card"
        button_label = "Current view" if is_current else "Open profile"
        button_variant = "ghost" if is_current else "secondary"
        cards.append(
            f"""
            <article class="{card_class}">
              <p class="entry-kicker">Identity Entry Point</p>
              <h3>{h(entry["display_name"])}</h3>
              <p>{h(entry["intro"])}</p>
              {render_button(button_label, href, button_variant)}
            </article>
            """
        )
    return "".join(cards)


def render_stats() -> str:
    active_cloud_certs = sum(
        1
        for item in DATA["certifications"]
        if item["group"] == "Current Cloud Credentials"
    )
    stats = [
        {"value": str(len(DATA["experience"])), "label": "Professional Roles"},
        {"value": str(len(DATA["projects"])), "label": "Featured Projects"},
        {"value": str(len(DATA.get("coursework", []))), "label": "Boulder Courses"},
        {"value": str(active_cloud_certs), "label": "Active Cloud Certs"},
    ]
    cards = []
    for stat in stats:
        cards.append(
            f"""
            <div class="stat-card">
              <span class="stat-value">{h(stat["value"])}</span>
              <span class="stat-label">{h(stat["label"])}</span>
            </div>
            """
        )
    return f'<div class="stats-grid">{"".join(cards)}</div>'


def render_focus_cards() -> str:
    return "".join(
        f"""
        <article class="info-card">
          {render_focus_icon(item.get("icon", ""))}
          <h3>{h(item["title"])}</h3>
          <p>{h(item["description"])}</p>
        </article>
        """
        for item in DATA["focus_areas"]
    )


def render_experience() -> str:
    cards = []
    for item in DATA["experience"]:
        bullets = "".join(f"<li>{h(line)}</li>" for line in item["highlights"])
        cards.append(
            f"""
            <article class="timeline-item">
              <div class="timeline-heading">
                <div>
                  <p class="timeline-kicker">{h(item["company"])}</p>
                  <h3>{h(item["role"])}</h3>
                </div>
                <div class="timeline-meta">
                  <span>{h(item["dates"])}</span>
                  <span>{h(item["location"])}</span>
                </div>
              </div>
              <p>{h(item["summary"])}</p>
              <ul class="clean-list">
                {bullets}
              </ul>
            </article>
            """
        )
    return "".join(cards)


def render_education() -> str:
    cards = []
    for item in DATA["education"]:
        details = "".join(f"<li>{h(line)}</li>" for line in item["details"])
        cards.append(
            f"""
            <article class="info-card education-card">
              <p class="eyebrow">{h(item["institution"])}</p>
              <h3>{h(item["qualification"])}</h3>
              <p class="meta-line">{h(item["dates"])} | {h(item["location"])}</p>
              <ul class="clean-list">
                {details}
              </ul>
            </article>
            """
        )
    return "".join(cards)


def render_coursework() -> str:
    items = DATA.get("coursework", [])
    if not items:
        return ""
    cards = []
    for item in items:
        courses_html = ""
        if "courses" in item:
            course_items = "".join(f"<li>{h(c)}</li>" for c in item["courses"])
            courses_html = f'<ul class="coursework-courses">{course_items}</ul>'
        cards.append(
            f"""
            <article class="coursework-card">
              <span class="coursework-type">{h(item["type"])}</span>
              <p class="eyebrow">{h(item["provider"])}</p>
              <h3>{h(item["title"])}</h3>
              <p class="meta-line">Completed {h(item["completed"])}</p>
              {courses_html}
              <a class="text-link" href="{h(item["link"])}"{external_attrs(item["link"])}>Verify credential</a>
            </article>
            """
        )
    return "".join(cards)


def render_learning() -> str:
    cards = []
    for item in DATA["learning"]:
        cards.append(
            f"""
            <article class="info-card compact-card">
              <p class="eyebrow">{h(item["provider"])}</p>
              <h3>{h(item["title"])}</h3>
              <p class="meta-line">{h(item["completed"])}</p>
              <a class="text-link" href="{h(item["link"])}"{external_attrs(item["link"])}>Verify credential</a>
            </article>
            """
        )
    return "".join(cards)


def render_certifications() -> str:
    grouped: dict[str, list[dict[str, str]]] = defaultdict(list)
    for item in DATA["certifications"]:
        grouped[item["group"]].append(item)

    order = [
        "Current Cloud Credentials",
        "Selected Professional Credentials",
        "Additional Specializations",
        "Credential History",
    ]

    blocks = []
    for group_name in order:
        items = grouped.get(group_name, [])
        if not items:
            continue
        cards = []
        for item in items:
            date_line = item["issued"]
            if item["expires"]:
                date_line = f'{item["issued"]} \u2014 Expires {item["expires"]}'
            cards.append(
                f"""
                <article class="credential-card">
                  <p class="credential-group">{h(item["issuer"])}</p>
                  <h3>{h(item["title"])}</h3>
                  <p class="meta-line">{h(date_line)}</p>
                  <p>{h(item["status"])}</p>
                  <a class="text-link" href="{h(item["link"])}"{external_attrs(item["link"])}>Open public credential</a>
                </article>
                """
            )
        blocks.append(
            f"""
            <div class="credential-block">
              <div class="section-heading narrow">
                <p class="eyebrow">{h(group_name)}</p>
              </div>
              <div class="card-grid credentials-grid">
                {"".join(cards)}
              </div>
            </div>
            """
        )
    return "".join(blocks)


def render_projects() -> str:
    return "".join(
        f"""
        <article class="project-card">
          <div class="project-top">
            <p class="eyebrow">{h(item["type"])}</p>
            <h3>{h(item["title"])}</h3>
          </div>
          <p>{h(item["description"])}</p>
          <div class="tag-row">
            {"".join(f'<span class="tag">{h(tag)}</span>' for tag in item["tech"])}
          </div>
          <a class="text-link" href="{h(item["link"])}"{external_attrs(item["link"])}>Open project</a>
        </article>
        """
        for item in DATA["projects"]
    )


def select_items_by_title(
    items: list[dict[str, str]], preferred_titles: list[str], limit: int
) -> list[dict[str, str]]:
    selected: list[dict[str, str]] = []
    selected_titles: set[str] = set()
    by_title = {item["title"]: item for item in items}

    for title in preferred_titles:
        item = by_title.get(title)
        if item and title not in selected_titles:
            selected.append(item)
            selected_titles.add(title)
            if len(selected) == limit:
                return selected

    for item in items:
        title = item["title"]
        if title in selected_titles:
            continue
        selected.append(item)
        selected_titles.add(title)
        if len(selected) == limit:
            break
    return selected


def render_resume_summary(display_name: str) -> str:
    return (
        f"{display_name} is a data scientist and data engineer with remote experience across "
        "production data workflows, analytics consulting, applied machine learning, and "
        "technical learner support. He works across Python, SQL, Google Cloud, AWS, and "
        "stakeholder-facing analytics, while completing a BSc in Engineering Management at the "
        "University of Debrecen and maintaining current Google Cloud certifications."
    )


def select_resume_experience() -> list[dict[str, str]]:
    preferred_companies = ["MetaPOS", "2U / edX", "Turing.com", "1Eight"]
    selected = []
    for company in preferred_companies:
        item = next(
            (experience for experience in DATA["experience"] if experience["company"] == company),
            None,
        )
        if item:
            selected.append(item)
    return selected


def resume_highlights_for(index: int, item: dict[str, str]) -> list[str]:
    extra_bullets = {0: 2, 1: 2, 2: 1, 3: 1}.get(index, 1)
    return [item["summary"], *item["highlights"][:extra_bullets]]


def cv_highlights_for(item: dict[str, str]) -> list[str]:
    return [item["summary"], *item["highlights"]]


def select_resume_credentials() -> list[dict[str, str]]:
    preferred_titles = [
        "Associate Cloud Engineer Certification",
        "Cloud Digital Leader Certification",
        "Professional Data Scientist",
        "IBM Data Science Professional Certificate",
    ]
    return select_items_by_title(DATA["certifications"], preferred_titles, 4)


def select_resume_projects() -> list[dict[str, str]]:
    preferred_titles = [
        "MetaPOS App Data Management",
        "FxPM 1.4 - Forex Portfolio Manager",
        "Streamlit-Based Recommender System",
    ]
    return select_items_by_title(DATA["projects"], preferred_titles, 3)


def render_document_variant_switcher(
    prefix: str, current_slug: str, current_kind: str
) -> str:
    links = []
    for entry in DATA["entry_points"]:
        href = resume_page_href(entry, prefix) if current_kind == "resume" else cv_page_href(entry, prefix)
        class_name = "resume-switch is-current" if entry["slug"] == current_slug else "resume-switch"
        links.append(
            f'<a class="{class_name}" href="{h(href)}">{h(entry["display_name"])}</a>'
        )
    return "".join(links)


def render_document_kind_switcher(
    entry: dict[str, str], prefix: str, current_kind: str
) -> str:
    kinds = [
        ("resume", "Resume", resume_page_href(entry, prefix)),
        ("cv", "CV", cv_page_href(entry, prefix)),
    ]
    links = []
    for kind, label, href in kinds:
        class_name = "resume-switch is-current" if kind == current_kind else "resume-switch"
        links.append(f'<a class="{class_name}" href="{h(href)}">{h(label)}</a>')
    return "".join(links)


def render_skill_groups(compact: bool = False) -> str:
    cards = []
    class_name = "resume-mini-item skill-group compact" if compact else "resume-mini-item skill-group"
    for group in DATA.get("skill_groups", []):
        items = ", ".join(group["items"])
        cards.append(
            f"""
            <div class="{class_name}">
              <strong>{h(group["label"])}</strong>
              <span>{h(items)}</span>
            </div>
            """
        )
    return "".join(cards)


def render_cv_summary(display_name: str) -> str:
    return (
        f"{display_name} is a data scientist, data engineer, and technical mentor with remote "
        "experience spanning production data workflows, analytics consulting, machine-learning "
        "delivery, and learner support. His work combines Python, SQL, cloud platforms, and "
        "clear stakeholder communication across commercial, educational, and mentoring contexts, "
        "alongside ongoing BSc study in Engineering Management at the University of Debrecen and "
        "completed University of Colorado Boulder coursework via Coursera."
    )


def select_cv_projects() -> list[dict[str, str]]:
    preferred_titles = [
        "MetaPOS App Data Management",
        "FxPM 1.4 - Forex Portfolio Manager",
        "MQL5 Expert Advisor",
        "Streamlit-Based Recommender System",
        "Regression Predict API",
        "OpenAI Trader Experiment",
    ]
    return select_items_by_title(DATA["projects"], preferred_titles, 6)


def render_coursework_item(item: dict[str, str], *, show_courses: bool) -> str:
    extra_lines = []
    if show_courses and item.get("courses"):
        extra_lines.append(
            f'<span>{"; ".join(h(course) for course in item["courses"])}</span>'
        )
    title = h(item["title"])
    if item.get("link"):
        title = (
            f'<a href="{h(item["link"])}"{external_attrs(item["link"])}>{h(item["title"])}</a>'
        )
    return f"""
    <div class="resume-mini-item">
      <strong>{title}</strong>
      <span>{h(item["provider"])} | {h(item["completed"])}</span>
      {''.join(extra_lines)}
    </div>
    """


def render_learning_item(item: dict[str, str]) -> str:
    title = h(item["title"])
    if item.get("link"):
        title = f'<a href="{h(item["link"])}"{external_attrs(item["link"])}>{h(item["title"])}</a>'
    return f"""
    <div class="resume-mini-item">
      <strong>{title}</strong>
      <span>{h(item["provider"])} | {h(item["completed"])}</span>
    </div>
    """


def person_schema(display_name: str) -> str:
    schema = {
        "@context": "https://schema.org",
        "@type": "Person",
        "name": display_name,
        "alternateName": DATA["identity"]["alternate_names"]
        + DATA["identity"]["full_name_variants"],
        "jobTitle": DATA["identity"]["headline"],
        "description": "Professional profile for Bongo Seakhoa, also known as Bongo Kosa.",
        "email": DATA["identity"]["email"],
        "sameAs": [
            link["url"] for link in DATA["links"] if not link["url"].startswith("mailto:")
        ],
        "knowsAbout": [
            "Python",
            "SQL",
            "Data Engineering",
            "Data Science",
            "Machine Learning",
            "Google Cloud",
            "AWS",
            "Analytics",
        ],
    }
    return json.dumps(schema, ensure_ascii=False, indent=2)


def render_aurora() -> str:
    return """
    <div class="aurora-bg" aria-hidden="true">
      <div class="orb"></div>
      <div class="orb"></div>
      <div class="orb"></div>
      <div class="orb"></div>
    </div>
    <canvas id="particles-canvas" aria-hidden="true"></canvas>
    """


def page_shell(
    *,
    title: str,
    description: str,
    prefix: str,
    page_class: str,
    body: str,
    display_name: str,
    include_effects: bool = True,
    include_script: bool = True,
) -> str:
    stylesheet = f"{prefix}assets/site.css"
    script = f"{prefix}assets/site.js"
    favicon = f"{prefix}assets/favicon.svg"
    effects = render_aurora() if include_effects else ""
    script_tag = f'<script src="{h(script)}" defer></script>' if include_script else ""
    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>{h(title)}</title>
      <meta name="description" content="{h(description)}">
      <meta name="theme-color" content="#09111d">
      <meta property="og:title" content="{h(title)}">
      <meta property="og:description" content="{h(description)}">
      <meta property="og:type" content="website">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
      <link rel="icon" type="image/svg+xml" href="{h(favicon)}">
      <link rel="stylesheet" href="{h(stylesheet)}">
      <script type="application/ld+json">
    {person_schema(display_name)}
      </script>
    </head>
    <body class="{h(page_class)}">
      {effects}
      {body}
      {script_tag}
    </body>
    </html>
    """


def render_header(prefix: str, home_href: str) -> str:
    return f"""
    <header class="site-header">
      <div class="shell header-shell">
        <a class="brand" href="{h(home_href)}">
          <span class="brand-mark">BK / BS</span>
          <span class="brand-copy">Professional Identity Hub</span>
        </a>
        <nav class="site-nav" aria-label="Main navigation">
          <a href="#experience">Experience</a>
          <a href="#credentials">Credentials</a>
          <a href="#projects">Projects</a>
          <a href="#resume">Resume</a>
          <a href="#contact">Contact</a>
        </nav>
      </div>
    </header>
    """


def render_footer(prefix: str) -> str:
    return f"""
    <footer class="site-footer">
      <div class="shell footer-shell">
        <div>
          <strong>{h(DATA["identity"]["primary_name"])}</strong>
          <p>{h(DATA["identity"]["identity_note"])}</p>
        </div>
        <div class="footer-links">
          <a href="{h(prefix + 'resume/')}">Resume & CV</a>
          <a href="{h(prefix + 'bongo-seakhoa/')}">Bongo Seakhoa</a>
          <a href="{h(prefix + 'bongo-kosa/')}">Bongo Kosa</a>
        </div>
      </div>
    </footer>
    """


def render_hub_page() -> str:
    identity = DATA["identity"]
    primary_entry = find_entry(PRIMARY_NAME)
    resume_selector_href = "resume/"
    primary_resume_pdf = resume_pdf_href(primary_entry)
    body = f"""
    {render_header('', 'index.html')}
    <main>
      <section class="hero">
        <div class="shell hero-grid">
          <div class="hero-copy reveal">
            <p class="eyebrow">Professional Identity Hub</p>
            <h1>One professional identity, two public surnames.</h1>
            <p class="lead">This profile hub makes it easy to find the right public entry point whether you know me as <strong>Bongo Seakhoa</strong> or <strong>Bongo Kosa</strong>.</p>
            <div class="button-row">
              {render_button('Open Resume & CV', resume_selector_href, 'primary')}
              {render_button('Contact by Email', 'mailto:' + identity['email'], 'secondary')}
            </div>
            <ul class="highlight-list">
              {render_profile_highlights()}
            </ul>
          </div>
          <aside class="hero-panel reveal">
            <p class="panel-kicker">Choose the name you know</p>
            <div class="entry-grid">
              {render_alias_cards('', None)}
            </div>
          </aside>
        </div>
      </section>

      <section id="about" class="section reveal">
        <div class="shell">
          <div class="section-heading">
            <p class="eyebrow">Profile</p>
            <h2>{h(identity['headline'])}</h2>
          </div>
          <div class="content-grid two-col">
            <div class="rich-copy">
              {"".join(f"<p>{h(paragraph)}</p>" for paragraph in identity["summary"])}
            </div>
            <div class="side-stack">
              <article class="info-card accent-card">
                <h3>Identity Note</h3>
                <p>{h(identity["identity_note"])}</p>
              </article>
              <article class="info-card">
                <h3>Based In</h3>
                <p>{h(identity["location"])}</p>
                <p>{h(identity["availability"])}</p>
              </article>
            </div>
          </div>
          {render_stats()}
        </div>
      </section>

      <section id="focus" class="section reveal">
        <div class="shell">
          <div class="section-heading">
            <p class="eyebrow">What I Do</p>
            <h2>Professional focus areas</h2>
          </div>
          <div class="card-grid">
            {render_focus_cards()}
          </div>
        </div>
      </section>

      <section id="experience" class="section reveal">
        <div class="shell">
          <div class="section-heading">
            <p class="eyebrow">Experience</p>
            <h2>Remote work across data, education, and analytics</h2>
          </div>
          <div class="timeline">
            {render_experience()}
          </div>
        </div>
      </section>

      <section id="education" class="section reveal">
        <div class="shell">
          <div class="section-heading">
            <p class="eyebrow">Education</p>
            <h2>Formal study and intensive professional training</h2>
          </div>
          <div class="card-grid">
            {render_education()}
          </div>
        </div>
      </section>

      <section id="coursework" class="section reveal">
        <div class="shell">
          <div class="section-heading">
            <p class="eyebrow">University Coursework via Coursera</p>
            <h2>Completed courses from the University of Colorado Boulder</h2>
          </div>
          <div class="card-grid">
            {render_coursework()}
          </div>
        </div>
      </section>

      <section id="credentials" class="section reveal">
        <div class="shell">
          <div class="section-heading">
            <p class="eyebrow">Credentials</p>
            <h2>Publicly shareable certification links only</h2>
          </div>
          {render_certifications()}
        </div>
      </section>

      <section id="projects" class="section reveal">
        <div class="shell">
          <div class="section-heading">
            <p class="eyebrow">Selected Work</p>
            <h2>Projects and portfolio signals</h2>
          </div>
          <div class="card-grid projects-grid">
            {render_projects()}
          </div>
        </div>
      </section>

      <section id="learning" class="section reveal">
        <div class="shell">
          <div class="section-heading">
            <p class="eyebrow">Additional Learning</p>
            <h2>Ongoing development through public learning platforms</h2>
          </div>
          <div class="card-grid">
            {render_learning()}
          </div>
        </div>
      </section>

      <section id="resume" class="section reveal">
        <div class="shell">
          <div class="cta-panel">
            <div>
              <p class="eyebrow">Documents</p>
              <h2>Open the resume or CV that matches the surname your visitor knows</h2>
              <p>{h(DATA["resume"]["tagline"])}</p>
            </div>
            <div class="button-row">
              {render_button('Open Document Hub', resume_selector_href, 'secondary')}
              {render_button('Download Primary Resume PDF', primary_resume_pdf, 'primary')}
            </div>
          </div>
        </div>
      </section>

      <section id="contact" class="section reveal">
        <div class="shell">
          <div class="section-heading">
            <p class="eyebrow">Contact</p>
            <h2>Public links for professional outreach</h2>
          </div>
          <div class="link-grid">
            {render_link_list()}
          </div>
        </div>
      </section>
    </main>
    {render_footer('')}
    """
    return page_shell(
        title=DATA["seo"]["site_title"],
        description=DATA["seo"]["site_description"],
        prefix="",
        page_class="profile-page",
        body=body,
        display_name=DATA["identity"]["primary_name"],
    )


def render_alias_page(entry: dict[str, str]) -> str:
    prefix = "../"
    resume_page = resume_page_href(entry, prefix)
    resume_pdf = resume_pdf_href(entry, prefix)
    cv_page = cv_page_href(entry, prefix)
    cv_pdf = cv_pdf_href(entry, prefix)
    is_primary = entry["display_name"] == DATA["identity"]["primary_name"]
    complementary = (
        DATA["identity"]["alternate_names"][0]
        if is_primary
        else DATA["identity"]["primary_name"]
    )
    body = f"""
    {render_header(prefix, '../index.html')}
    <main>
      <section class="hero alias-hero">
        <div class="shell hero-grid">
          <div class="hero-copy reveal">
            <p class="eyebrow">Identity Entry Point</p>
            <h1>{h(entry["display_name"])}</h1>
            <p class="lead">{h(DATA["identity"]["headline"])}</p>
            <p>{h(entry["intro"])}</p>
            <div class="button-row">
              {render_button('Open Resume', resume_page, 'secondary')}
              {render_button('Open CV', cv_page, 'secondary')}
              {render_button('View Hub Home', '../index.html', 'secondary')}
            </div>
          </div>
          <aside class="hero-panel reveal">
            <p class="panel-kicker">Same person, alternate surname</p>
            <h3>{h(complementary)}</h3>
            <p>{h(DATA["identity"]["identity_note"])}</p>
            <div class="entry-grid">
              {render_alias_cards(prefix, entry["slug"])}
            </div>
          </aside>
        </div>
      </section>

      <section id="about" class="section reveal">
        <div class="shell">
          <div class="section-heading">
            <p class="eyebrow">Profile Summary</p>
            <h2>Professional background</h2>
          </div>
          <div class="content-grid two-col">
            <div class="rich-copy">
              {"".join(f"<p>{h(paragraph)}</p>" for paragraph in DATA["identity"]["summary"])}
            </div>
            <div class="side-stack">
              <article class="info-card accent-card">
                <h3>Known Publicly As</h3>
                <p>{h(DATA["identity"]["primary_name"])} and {h(DATA["identity"]["alternate_names"][0])}</p>
              </article>
              <article class="info-card">
                <h3>Location and Work Style</h3>
                <p>{h(DATA["identity"]["location"])}</p>
                <p>{h(DATA["identity"]["availability"])}</p>
              </article>
            </div>
          </div>
          {render_stats()}
        </div>
      </section>

      <section id="focus" class="section reveal">
        <div class="shell">
          <div class="section-heading">
            <p class="eyebrow">Strength Areas</p>
            <h2>Where this profile is strongest</h2>
          </div>
          <div class="card-grid">
            {render_focus_cards()}
          </div>
        </div>
      </section>

      <section id="experience" class="section reveal">
        <div class="shell">
          <div class="section-heading">
            <p class="eyebrow">Experience</p>
            <h2>Recent roles and contributions</h2>
          </div>
          <div class="timeline">
            {render_experience()}
          </div>
        </div>
      </section>

      <section id="credentials" class="section reveal">
        <div class="shell">
          <div class="section-heading">
            <p class="eyebrow">Credentials</p>
            <h2>Selected qualifications and public badges</h2>
          </div>
          {render_certifications()}
        </div>
      </section>

      <section id="projects" class="section reveal">
        <div class="shell">
          <div class="section-heading">
            <p class="eyebrow">Portfolio</p>
            <h2>Selected project signals</h2>
          </div>
          <div class="card-grid projects-grid">
            {render_projects()}
          </div>
        </div>
      </section>

      <section id="resume" class="section reveal">
        <div class="shell">
          <div class="cta-panel">
            <div>
              <p class="eyebrow">Documents</p>
              <h2>Need a downloadable version?</h2>
              <p>{h(DATA["resume"]["identity_line"])}</p>
            </div>
            <div class="button-row">
              {render_button('Download Resume PDF', resume_pdf, 'primary')}
              {render_button('Download CV PDF', cv_pdf, 'secondary')}
            </div>
          </div>
        </div>
      </section>

      <section id="contact" class="section reveal">
        <div class="shell">
          <div class="section-heading">
            <p class="eyebrow">Contact</p>
            <h2>Professional links</h2>
          </div>
          <div class="link-grid">
            {render_link_list()}
          </div>
        </div>
      </section>
    </main>
    {render_footer(prefix)}
    """
    return page_shell(
        title=f'{entry["display_name"]} | Professional Profile',
        description=DATA["seo"]["site_description"],
        prefix=prefix,
        page_class="profile-page",
        body=body,
        display_name=entry["display_name"],
    )


def render_resume_selector_page() -> str:
    cards = []
    for entry in DATA["entry_points"]:
        cards.append(
            f"""
            <article class="entry-card">
              <p class="entry-kicker">Document Suite</p>
                <h3>{h(entry["display_name"])}</h3>
              <p>Choose the HTML or PDF version that matches this public surname. The professional record stays aligned across both surname variants.</p>
              <div class="button-row">
                {render_button('Open Resume', resume_page_href(entry, '../'), 'secondary')}
                {render_button('Resume PDF', resume_pdf_href(entry, '../'), 'primary')}
                {render_button('Open CV', cv_page_href(entry, '../'), 'secondary')}
                {render_button('CV PDF', cv_pdf_href(entry, '../'), 'primary')}
              </div>
            </article>
            """
        )

    body = f"""
    <main class="resume-selector-page">
      <section class="hero">
        <div class="shell">
          <div class="hero-copy reveal">
            <p class="eyebrow">Resume & CV</p>
            <h1>Choose the surname version and document type you want to open or download.</h1>
            <p class="lead">Both surname variants describe the same professional background, experience, qualifications, and projects. The displayed surname is the only intentional change between them.</p>
            <div class="button-row">
              {render_button('Back to Profile Hub', '../index.html', 'secondary')}
            </div>
          </div>
          <div class="entry-grid reveal">
            {"".join(cards)}
          </div>
        </div>
      </section>
    </main>
    {render_footer('../')}
    """
    return page_shell(
        title="Resume & CV | Bongo Seakhoa | Bongo Kosa",
        description="Choose the surname-matched resume or CV variant for Bongo Seakhoa or Bongo Kosa.",
        prefix="../",
        page_class="profile-page",
        body=body,
        display_name=PRIMARY_NAME,
    )


def render_resume_variant_page(entry: dict[str, str]) -> str:
    prefix = "../../"
    display_name = entry["display_name"]
    pdf_href = resume_pdf_href(entry, prefix)
    experience_html = []
    for index, item in enumerate(select_resume_experience()):
        bullets = "".join(
            f"<li>{h(line)}</li>" for line in resume_highlights_for(index, item)
        )
        experience_html.append(
            f"""
            <article class="resume-item">
              <div class="resume-item-heading">
                <div>
                  <h3>{h(item["role"])} | {h(item["company"])}</h3>
                  <p>{h(item["location"])}</p>
                </div>
                <span>{h(item["dates"])}</span>
              </div>
              <ul class="clean-list">
                {bullets}
              </ul>
            </article>
            """
        )

    education_html = []
    for item in DATA["education"]:
        bullets = "".join(f"<li>{h(line)}</li>" for line in item["details"][:1])
        education_html.append(
            f"""
            <article class="resume-item compact">
              <div class="resume-item-heading">
                <div>
                  <h3>{h(item["qualification"])}</h3>
                  <p>{h(item["institution"])} | {h(item["location"])}</p>
                </div>
                <span>{h(item["dates"])}</span>
              </div>
              <ul class="clean-list">
                {bullets}
              </ul>
            </article>
            """
        )

    coursework_html = [render_coursework_item(item, show_courses=False) for item in DATA.get("coursework", [])]

    credential_html = []
    for item in select_resume_credentials():
        title = h(item["title"])
        if item.get("link"):
            title = f'<a href="{h(item["link"])}"{external_attrs(item["link"])}>{h(item["title"])}</a>'
        credential_html.append(
            f"""
            <div class="resume-mini-item">
              <strong>{title}</strong>
              <span>{h(item["issuer"])} | {h(item["status"])}</span>
            </div>
            """
        )

    project_html = []
    for item in select_resume_projects():
        title = h(item["title"])
        if item.get("link"):
            title = f'<a href="{h(item["link"])}"{external_attrs(item["link"])}>{h(item["title"])}</a>'
        project_html.append(
            f"""
            <article class="resume-item compact">
              <div class="resume-item-heading">
                <div>
                  <h3>{title}</h3>
                  <p>{h(item["type"])}</p>
                </div>
              </div>
              <p>{h(item["description"])}</p>
              <p><strong>Tech:</strong> {h(", ".join(item["tech"]))}</p>
            </article>
            """
        )

    body = f"""
    <main class="resume-main">
      <section class="resume-toolbar no-print">
        <div class="shell resume-toolbar-shell">
          <a class="resume-back" href="../../index.html">Back to profile hub</a>
          <div class="resume-toolbar-actions">
            <div class="resume-switcher">
              {render_document_variant_switcher(prefix, entry["slug"], 'resume')}
            </div>
            <div class="resume-switcher">
              {render_document_kind_switcher(entry, prefix, 'resume')}
            </div>
            {render_button('Resume Options', '../', 'secondary')}
            {render_button('Download PDF', pdf_href, 'primary')}
          </div>
        </div>
      </section>

      <section class="shell">
        <article class="resume-sheet resume-document">
          <header class="resume-document-header">
            <div>
              <p class="resume-kicker">Professional Resume</p>
              <h1 class="resume-document-name">{h(display_name)}</h1>
              <p class="resume-document-title">{h(DATA["identity"]["headline"])}</p>
            </div>
            <p class="resume-document-note">{h(DATA["identity"]["availability"])}</p>
          </header>

          <div class="resume-contact">
            <span>{h(DATA["identity"]["location"])}</span>
            <a href="mailto:{h(DATA["identity"]["email"])}">{h(DATA["identity"]["email"])}</a>
            <span>{h(DATA["identity"]["phone"])}</span>
            <a href="https://www.linkedin.com/in/bongo-seakhoa/" target="_blank" rel="noreferrer">linkedin.com/in/bongo-seakhoa</a>
            <a href="https://github.com/Bongo-Seakhoa" target="_blank" rel="noreferrer">github.com/Bongo-Seakhoa</a>
          </div>

          <section class="resume-section">
            <h2>Professional Summary</h2>
            <p>{h(render_resume_summary(display_name))}</p>
          </section>

          <section class="resume-section">
            <h2>Technical Toolkit</h2>
            <div class="resume-mini-list resume-credentials-grid">
              {render_skill_groups(compact=True)}
            </div>
          </section>

          <section class="resume-section" id="experience">
            <h2>Experience</h2>
            <div class="resume-list">
              {"".join(experience_html)}
            </div>
          </section>

          <section class="resume-section" id="projects">
            <h2>Selected Projects</h2>
            <div class="resume-list">
              {"".join(project_html)}
            </div>
          </section>

          <section class="resume-section" id="education">
            <h2>Education</h2>
            <div class="resume-list">
              {"".join(education_html)}
            </div>
          </section>

          <section class="resume-section" id="coursework">
            <h2>Selected Coursework</h2>
            <div class="resume-mini-list">
              {"".join(coursework_html)}
            </div>
          </section>

          <section class="resume-section" id="credentials">
            <h2>Selected Credentials</h2>
            <div class="resume-mini-list resume-credentials-grid">
              {"".join(credential_html)}
            </div>
          </section>
        </article>
      </section>
    </main>
    """
    return page_shell(
        title=f"{display_name} | Resume",
        description=f"Professional resume for {display_name}.",
        prefix=prefix,
        page_class="resume-page",
        body=body,
        display_name=display_name,
        include_effects=False,
        include_script=False,
    )


def render_cv_variant_page(entry: dict[str, str]) -> str:
    prefix = "../../../"
    display_name = entry["display_name"]
    pdf_href = cv_pdf_href(entry, prefix)
    experience_html = []
    for item in DATA["experience"]:
        bullets = "".join(f"<li>{h(line)}</li>" for line in cv_highlights_for(item))
        experience_html.append(
            f"""
            <article class="resume-item">
              <div class="resume-item-heading">
                <div>
                  <h3>{h(item["role"])} | {h(item["company"])}</h3>
                  <p>{h(item["location"])}</p>
                </div>
                <span>{h(item["dates"])}</span>
              </div>
              <ul class="clean-list">
                {bullets}
              </ul>
            </article>
            """
        )

    education_html = []
    for item in DATA["education"]:
        details = "".join(f"<li>{h(line)}</li>" for line in item["details"])
        education_html.append(
            f"""
            <article class="resume-item compact">
              <div class="resume-item-heading">
                <div>
                  <h3>{h(item["qualification"])}</h3>
                  <p>{h(item["institution"])} | {h(item["location"])}</p>
                </div>
                <span>{h(item["dates"])}</span>
              </div>
              <ul class="clean-list">
                {details}
              </ul>
            </article>
            """
        )

    coursework_html = [
        render_coursework_item(item, show_courses=True) for item in DATA.get("coursework", [])
    ]
    learning_html = [render_learning_item(item) for item in DATA.get("learning", [])]

    project_html = []
    for item in select_cv_projects():
        title = h(item["title"])
        if item.get("link"):
            title = f'<a href="{h(item["link"])}"{external_attrs(item["link"])}>{h(item["title"])}</a>'
        project_html.append(
            f"""
            <article class="resume-item compact">
              <div class="resume-item-heading">
                <div>
                  <h3>{title}</h3>
                  <p>{h(item["type"])}</p>
                </div>
              </div>
              <p>{h(item["description"])}</p>
              <p><strong>Tech:</strong> {h(", ".join(item["tech"]))}</p>
            </article>
            """
        )

    grouped_credentials: dict[str, list[dict[str, str]]] = defaultdict(list)
    for item in DATA["certifications"]:
        grouped_credentials[item["group"]].append(item)

    credential_sections = []
    for group, items in grouped_credentials.items():
        item_html = []
        for item in items:
            title = h(item["title"])
            if item.get("link"):
                title = (
                    f'<a href="{h(item["link"])}"{external_attrs(item["link"])}>{h(item["title"])}</a>'
                )
            issued = f"Issued {item['issued']}"
            expiry = f" | Expires {item['expires']}" if item.get("expires") else ""
            item_html.append(
                f"""
                <div class="resume-mini-item">
                  <strong>{title}</strong>
                  <span>{h(item["issuer"])} | {h(item["status"])}</span>
                  <span>{h(issued + expiry)}</span>
                </div>
                """
            )
        credential_sections.append(
            f"""
            <div class="resume-subsection">
              <h3>{h(group)}</h3>
              <div class="resume-mini-list">
                {''.join(item_html)}
              </div>
            </div>
            """
        )

    body = f"""
    <main class="resume-main">
      <section class="resume-toolbar no-print">
        <div class="shell resume-toolbar-shell">
          <a class="resume-back" href="../../../index.html">Back to profile hub</a>
          <div class="resume-toolbar-actions">
            <div class="resume-switcher">
              {render_document_variant_switcher(prefix, entry["slug"], 'cv')}
            </div>
            <div class="resume-switcher">
              {render_document_kind_switcher(entry, prefix, 'cv')}
            </div>
            {render_button('Resume & CV Hub', '../../', 'secondary')}
            {render_button('Download PDF', pdf_href, 'primary')}
          </div>
        </div>
      </section>

      <section class="shell">
        <article class="resume-sheet resume-document">
          <header class="resume-document-header">
            <div>
              <p class="resume-kicker">Curriculum Vitae</p>
              <h1 class="resume-document-name">{h(display_name)}</h1>
              <p class="resume-document-title">{h(DATA["identity"]["headline"])}</p>
            </div>
            <p class="resume-document-note">Detailed record of experience, credentials, project work, and public learning.</p>
          </header>

          <div class="resume-contact">
            <span>{h(DATA["identity"]["location"])}</span>
            <a href="mailto:{h(DATA["identity"]["email"])}">{h(DATA["identity"]["email"])}</a>
            <span>{h(DATA["identity"]["phone"])}</span>
            <a href="https://www.linkedin.com/in/bongo-seakhoa/" target="_blank" rel="noreferrer">linkedin.com/in/bongo-seakhoa</a>
            <a href="https://github.com/Bongo-Seakhoa" target="_blank" rel="noreferrer">github.com/Bongo-Seakhoa</a>
          </div>

          <section class="resume-section">
            <h2>Profile</h2>
            <p>{h(render_cv_summary(display_name))}</p>
          </section>

          <section class="resume-section">
            <h2>Technical Toolkit</h2>
            <div class="resume-mini-list resume-credentials-grid">
              {render_skill_groups(compact=False)}
            </div>
          </section>

          <section class="resume-section">
            <h2>Professional Experience</h2>
            <div class="resume-list">
              {"".join(experience_html)}
            </div>
          </section>

          <section class="resume-section">
            <h2>Selected Projects</h2>
            <div class="resume-list">
              {"".join(project_html)}
            </div>
          </section>

          <section class="resume-section">
            <h2>Education</h2>
            <div class="resume-list">
              {"".join(education_html)}
            </div>
          </section>

          <section class="resume-section">
            <h2>University of Colorado Boulder Coursework via Coursera</h2>
            <div class="resume-mini-list">
              {"".join(coursework_html)}
            </div>
          </section>

          <section class="resume-section">
            <h2>Credentials</h2>
            {"".join(credential_sections)}
          </section>

          <section class="resume-section">
            <h2>Additional Learning</h2>
            <div class="resume-mini-list">
              {"".join(learning_html)}
            </div>
          </section>
        </article>
      </section>
    </main>
    """
    return page_shell(
        title=f"{display_name} | Curriculum Vitae",
        description=f"Professional CV for {display_name}.",
        prefix=prefix,
        page_class="resume-page cv-page",
        body=body,
        display_name=display_name,
        include_effects=False,
        include_script=False,
    )


def render_404() -> str:
    body = f"""
    <main class="not-found-page">
      <section class="shell not-found-shell">
        <p class="eyebrow">404</p>
        <h1>That page does not exist.</h1>
        <p>Use the professional identity hub to choose the surname you know and continue from there.</p>
        <div class="entry-grid">
          {render_alias_cards('', None)}
        </div>
        <div class="button-row">
          {render_button('Return to Home', 'index.html', 'primary')}
        </div>
      </section>
    </main>
    """
    return page_shell(
        title="Profile Hub | Page Not Found",
        description=DATA["seo"]["site_description"],
        prefix="",
        page_class="profile-page",
        body=body,
        display_name=DATA["identity"]["primary_name"],
    )


def build_pages() -> None:
    write_file("index.html", render_hub_page())
    for entry in DATA["entry_points"]:
        write_file(f'{entry["slug"]}/index.html', render_alias_page(entry))
    write_file("resume/index.html", render_resume_selector_page())
    for entry in DATA["entry_points"]:
        write_file(f'resume/{entry["slug"]}/index.html', render_resume_variant_page(entry))
        write_file(f'resume/cv/{entry["slug"]}/index.html', render_cv_variant_page(entry))
    write_file("404.html", render_404())
    write_file(
        "robots.txt",
        """
        User-agent: *
        Allow: /
        """,
    )


def build_pdf() -> None:
    browser_candidates = [
        Path("C:/Program Files/Google/Chrome/Application/chrome.exe"),
        Path("C:/Program Files (x86)/Google/Chrome/Application/chrome.exe"),
        Path("C:/Program Files/Microsoft/Edge/Application/msedge.exe"),
        Path("C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"),
    ]
    browser = next((candidate for candidate in browser_candidates if candidate.exists()), None)
    if browser is None:
        print("No Chrome or Edge installation found. Skipping PDF generation.")
        return

    output_dir = ROOT / "assets" / "files"
    output_dir.mkdir(parents=True, exist_ok=True)

    jobs = []
    for entry in DATA["entry_points"]:
        jobs.append(
            (
                "resume",
                entry["display_name"],
                output_dir / resume_pdf_name(entry),
                (ROOT / "resume" / entry["slug"] / "index.html").resolve().as_uri(),
            )
        )
        jobs.append(
            (
                "cv",
                entry["display_name"],
                output_dir / cv_pdf_name(entry),
                (ROOT / "resume" / "cv" / entry["slug"] / "index.html").resolve().as_uri(),
            )
        )

    for kind, display_name, output_pdf, source_url in jobs:
        command = [
            str(browser),
            "--headless=new",
            "--disable-gpu",
            "--run-all-compositor-stages-before-draw",
            "--virtual-time-budget=2500",
            "--no-pdf-header-footer",
            f"--print-to-pdf={output_pdf}",
            "--print-to-pdf-no-header",
            source_url,
        ]
        try:
            subprocess.run(command, check=True, capture_output=True, text=True)
            print(f"Generated {kind} PDF for {display_name} at {output_pdf}")
        except subprocess.CalledProcessError as error:
            print(f"PDF generation failed for {display_name} ({kind}).")
            if error.stderr:
                print(error.stderr.strip())


def main() -> None:
    build_pages()
    build_pdf()
    print(f"Site generated on {TODAY}")


if __name__ == "__main__":
    main()
