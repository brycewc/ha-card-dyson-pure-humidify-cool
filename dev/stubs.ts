import * as mdi from "@mdi/js";

const icons = mdi as Record<string, string>;

function iconPath(name: string | null): string {
  if (!name?.startsWith("mdi:")) return "";
  const key = `mdi${name
    .slice(4)
    .split("-")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("")}`;
  return icons[key] ?? icons.mdiHelpCircleOutline;
}

class StubIcon extends HTMLElement {
  static observedAttributes = ["icon"];

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    this.render();
  }

  private render() {
    const root = this.shadowRoot ?? this.attachShadow({ mode: "open" });
    root.innerHTML = `
      <style>
        :host { display: inline-flex; width: var(--mdc-icon-size, 24px); height: var(--mdc-icon-size, 24px); }
        svg { width: 100%; height: 100%; fill: currentColor; }
      </style>
      <svg viewBox="0 0 24 24"><path d="${iconPath(this.getAttribute("icon"))}"></path></svg>`;
  }
}

class StubCard extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    this.attachShadow({ mode: "open" }).innerHTML = `
      <style>
        :host {
          display: block;
          background: var(--ha-card-background, var(--card-background-color, #fff));
          border-radius: var(--ha-card-border-radius, 12px);
          border: var(--ha-card-border-width, 1px) solid var(--ha-card-border-color, var(--divider-color, #e0e0e0));
          box-shadow: var(--ha-card-box-shadow, none);
          color: var(--primary-text-color);
        }
      </style>
      <slot></slot>`;
  }
}

export function defineStubs() {
  if (!customElements.get("ha-icon")) customElements.define("ha-icon", StubIcon);
  if (!customElements.get("ha-card")) customElements.define("ha-card", StubCard);
}
