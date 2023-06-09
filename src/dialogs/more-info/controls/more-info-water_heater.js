import "@material/mwc-list/mwc-list-item";
import "@polymer/iron-flex-layout/iron-flex-layout-classes";
import { timeOut } from "@polymer/polymer/lib/utils/async";
import { Debouncer } from "@polymer/polymer/lib/utils/debounce";
import { html } from "@polymer/polymer/lib/utils/html-tag";
/* eslint-plugin-disable lit */
import { PolymerElement } from "@polymer/polymer/polymer-element";
import { featureClassNames } from "../../../common/entity/feature_class_names";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-select";
import "../../../components/ha-switch";
import "../../../components/ha-water_heater-control";
import { EventsMixin } from "../../../mixins/events-mixin";
import LocalizeMixin from "../../../mixins/localize-mixin";

/*
 * @appliesMixin EventsMixin
 * @appliesMixin LocalizeMixin
 */
class MoreInfoWaterHeater extends LocalizeMixin(EventsMixin(PolymerElement)) {
  static get template() {
    return html`
      <style include="iron-flex"></style>
      <style>
        :host {
          color: var(--primary-text-color);
        }

        ha-select {
          width: 100%;
        }

        ha-water_heater-control.range-control-left,
        ha-water_heater-control.range-control-right {
          float: left;
          width: 46%;
        }
        ha-water_heater-control.range-control-left {
          margin-right: 4%;
        }
        ha-water_heater-control.range-control-right {
          margin-left: 4%;
        }

        .single-row {
          padding: 8px 0;
        }
      </style>

      <div class$="[[computeClassNames(stateObj)]]">
        <div class="container-temperature">
          <div class$="[[stateObj.attributes.operation_mode]]">
            <div hidden$="[[!supportsTemperatureControls(stateObj)]]">
              [[localize('ui.card.water_heater.target_temperature')]]
            </div>
            <template is="dom-if" if="[[supportsTemperature(stateObj)]]">
              <ha-water_heater-control
                value="[[stateObj.attributes.temperature]]"
                units="[[hass.config.unit_system.temperature]]"
                step="[[computeTemperatureStepSize(hass, stateObj)]]"
                min="[[stateObj.attributes.min_temp]]"
                max="[[stateObj.attributes.max_temp]]"
                on-change="targetTemperatureChanged"
              >
              </ha-water_heater-control>
            </template>
          </div>
        </div>

        <template is="dom-if" if="[[supportsOperationMode(stateObj)]]">
          <div class="container-operation_list">
            <div class="controls">
              <ha-select
                label="[[localize('ui.card.water_heater.operation')]]"
                value="[[stateObj.attributes.operation_mode]]"
                on-selected="handleOperationmodeChanged"
                fixedMenuPosition
                naturalMenuWidth
                on-closed="stopPropagation"
              >
                <template
                  is="dom-repeat"
                  items="[[stateObj.attributes.operation_list]]"
                >
                  <mwc-list-item value="[[item]]">
                    [[_localizeOperationMode(localize, item)]]
                  </mwc-list-item>
                </template>
              </ha-select>
            </div>
          </div>
        </template>

        <template is="dom-if" if="[[supportsAwayMode(stateObj)]]">
          <div class="container-away_mode">
            <div class="center horizontal layout single-row">
              <div class="flex">
                [[localize('ui.card.water_heater.away_mode')]]
              </div>
              <ha-switch
                checked="[[awayToggleChecked]]"
                on-change="awayToggleChanged"
              >
              </ha-switch>
            </div>
          </div>
        </template>
      </div>
    `;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
      },

      stateObj: {
        type: Object,
        observer: "stateObjChanged",
      },

      awayToggleChecked: Boolean,
    };
  }

  stateObjChanged(newVal, oldVal) {
    if (newVal) {
      this.setProperties({
        awayToggleChecked: newVal.attributes.away_mode === "on",
      });
    }

    if (oldVal) {
      this._debouncer = Debouncer.debounce(
        this._debouncer,
        timeOut.after(500),
        () => {
          this.fire("iron-resize");
        }
      );
    }
  }

  computeTemperatureStepSize(hass, stateObj) {
    if (stateObj.attributes.target_temp_step) {
      return stateObj.attributes.target_temp_step;
    }
    if (hass.config.unit_system.temperature.indexOf("F") !== -1) {
      return 1;
    }
    return 0.5;
  }

  supportsTemperatureControls(stateObj) {
    return this.supportsTemperature(stateObj);
  }

  supportsTemperature(stateObj) {
    return (
      supportsFeature(stateObj, 1) &&
      typeof stateObj.attributes.temperature === "number"
    );
  }

  supportsOperationMode(stateObj) {
    return supportsFeature(stateObj, 2);
  }

  supportsAwayMode(stateObj) {
    return supportsFeature(stateObj, 4);
  }

  computeClassNames(stateObj) {
    const _featureClassNames = {
      1: "has-target_temperature",
      2: "has-operation_mode",
      4: "has-away_mode",
    };

    const classes = [featureClassNames(stateObj, _featureClassNames)];

    classes.push("more-info-water_heater");

    return classes.join(" ");
  }

  targetTemperatureChanged(ev) {
    const temperature = ev.target.value;
    if (temperature === this.stateObj.attributes.temperature) return;
    this.callServiceHelper("set_temperature", { temperature: temperature });
  }

  awayToggleChanged(ev) {
    const oldVal = this.stateObj.attributes.away_mode === "on";
    const newVal = ev.target.checked;
    if (oldVal === newVal) return;
    this.callServiceHelper("set_away_mode", { away_mode: newVal });
  }

  handleOperationmodeChanged(ev) {
    const oldVal = this.stateObj.attributes.operation_mode;
    const newVal = ev.target.value;
    if (!newVal || oldVal === newVal) return;
    this.callServiceHelper("set_operation_mode", {
      operation_mode: newVal,
    });
  }

  stopPropagation(ev) {
    ev.stopPropagation();
  }

  callServiceHelper(service, data) {
    // We call stateChanged after a successful call to re-sync the inputs
    // with the state. It will be out of sync if our service call did not
    // result in the entity to be turned on. Since the state is not changing,
    // the resync is not called automatic.
    /* eslint-disable no-param-reassign */
    data.entity_id = this.stateObj.entity_id;
    /* eslint-enable no-param-reassign */
    this.hass.callService("water_heater", service, data).then(() => {
      this.stateObjChanged(this.stateObj);
    });
  }

  _localizeOperationMode(localize, mode) {
    return (
      localize(`component.water_heater.entity_component._.state.${mode}`) ||
      mode
    );
  }
}

customElements.define("more-info-water_heater", MoreInfoWaterHeater);
