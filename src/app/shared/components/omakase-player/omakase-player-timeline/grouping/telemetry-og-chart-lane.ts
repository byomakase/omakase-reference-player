/*
 * Copyright 2024 ByOmakase, LLC (https://byomakase.org)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {ConfigWithOptionalStyle, OgChartLane, OgChartLaneConfig} from '@byomakase/omakase-player';
import {TelemetryAdapter} from './telemetry-adapter';
import {TelemetryApi} from './telemetry-api';

export class TelemetryOgChartLane extends OgChartLane implements TelemetryApi {
  private _adapter: TelemetryAdapter = new TelemetryAdapter(this);

  constructor(config: ConfigWithOptionalStyle<OgChartLaneConfig>) {
    super(config);
  }

  get telemetryButton() {
    return this._adapter.telemetryButton;
  }

  get isHidden() {
    return this._adapter.isHidden;
  }

  override get description() {
    return this._description ?? '';
  }

  activateTelemetryIcon() {
    this._adapter.activateTelemetryIcon();
  }

  deactivateTelemetryIcon() {
    this._adapter.deactivateTelemetryIcon();
  }

  addTelemetryButton(listening: boolean) {
    this._adapter.addTelemetryButton(listening);
  }

  toggleHidden() {
    this._adapter.toggleHidden();
  }
}
