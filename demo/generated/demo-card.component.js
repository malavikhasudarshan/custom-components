class DemoCard extends HTMLElement {
  static get observedAttributes() {
    return ['color', 'font-size', 'border-radius', 'text'];
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    this.render();
  }

  render() {
    const color = this.getAttribute('color') ?? 'teal';
    const fontSize = this.getAttribute('font-size') ?? '18px';
    const borderRadius = this.getAttribute('border-radius') ?? '12px';
    const text = this.getAttribute('text') ?? 'Hello custom component';

    this.innerHTML = `
      <style>
        .card {
          color: ${color};
          font-size: ${fontSize};
          border-radius: ${borderRadius};
          border: 1px solid #c7c7c7;
          padding: 12px;
          width: fit-content;
          background: #f8fffe;
          font-family: sans-serif;
        }
      </style>
      <div class="card">${text}</div>
    `;
  }
}

if (!customElements.get('demo-card')) {
  customElements.define('demo-card', DemoCard);
}
