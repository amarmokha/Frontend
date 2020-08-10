import "../ha-icon-button";
import "@polymer/paper-input/paper-input";
import type { PaperInputElement } from "@polymer/paper-input/paper-input";
import {
  customElement,
  html,
  LitElement,
  property,
  internalProperty,
  query,
  TemplateResult,
} from "lit-element";
import { fireEvent } from "../../common/dom/fire_event";
import type {
  HaFormElement,
  HaFormStringData,
  HaFormStringSchema,
} from "./ha-form";

@customElement("ha-form-string")
export class HaFormString extends LitElement implements HaFormElement {
  @property() public schema!: HaFormStringSchema;

  @property() public data!: HaFormStringData;

  @property() public label!: string;

  @property() public suffix!: string;

  @internalProperty() private _unmaskedPassword = false;

  @query("paper-input") private _input?: HTMLElement;

  public focus(): void {
    if (this._input) {
      this._input.focus();
    }
  }

  protected firstUpdated(): void {
    if (this.schema.name.includes("password")) {
      const stepInput = document.createElement("input");
      stepInput.setAttribute("type", "password");
      stepInput.setAttribute("name", "password");
      stepInput.setAttribute("autocomplete", "on");
      stepInput.onkeyup = (ev) => this._externalValueChanged(ev, this);
      document.documentElement.appendChild(stepInput);
    } else if (this.schema.name.includes("username")) {
      const stepInput = document.createElement("input");
      stepInput.setAttribute("type", "text");
      stepInput.setAttribute("name", "username");
      stepInput.setAttribute("autocomplete", "on");
      stepInput.onkeyup = (ev) => this._externalValueChanged(ev, this);
      document.documentElement.appendChild(stepInput);
    }
  }

  protected render(): TemplateResult {
    return this.schema.name.includes("password")
      ? html`
          <paper-input
            .type=${this._unmaskedPassword ? "text" : "password"}
            .label=${this.label}
            .value=${this.data}
            .required=${this.schema.required}
            .autoValidate=${this.schema.required}
            @value-changed=${this._valueChanged}
          >
            <ha-icon-button
              toggles
              slot="suffix"
              .icon=${this._unmaskedPassword ? "hass:eye-off" : "hass:eye"}
              id="iconButton"
              title="Click to toggle between masked and clear password"
              @click=${this._toggleUnmaskedPassword}
            >
            </ha-icon-button>
          </paper-input>
        `
      : html`
          <paper-input
            .type=${this._stringType}
            .label=${this.label}
            .value=${this.data}
            .required=${this.schema.required}
            .autoValidate=${this.schema.required}
            error-message="Required"
            @value-changed=${this._valueChanged}
          ></paper-input>
        `;
  }

  private _toggleUnmaskedPassword(): void {
    this._unmaskedPassword = !this._unmaskedPassword;
  }

  private _valueChanged(ev: Event): void {
    const value = (ev.target as PaperInputElement).value;
    if (this.data === value) {
      return;
    }

    fireEvent(this, "value-changed", {
      value,
    });
  }

  private _externalValueChanged(ev: Event, el): void {
    const value = (ev.target as PaperInputElement).value;
    if (this.data === value) {
      return;
    }

    el.shadowRoot!.querySelector("paper-input").value = value;
  }

  private get _stringType(): string {
    if (this.schema.format) {
      if (["email", "url"].includes(this.schema.format)) {
        return this.schema.format;
      }
      if (this.schema.format === "fqdnurl") {
        return "url";
      }
    }
    return "text";
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-form-string": HaFormString;
  }
}
