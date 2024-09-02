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

import {ConfigWithOptionalStyle, ImageButton, LineChartLane, LineChartLaneConfig} from '@byomakase/omakase-player';
import {Constants} from '../../../../constants/constants';

export class TelemetryLineChartLane extends LineChartLane {
  private _telemetryButton?: ImageButton;

  constructor(config: ConfigWithOptionalStyle<LineChartLaneConfig>) {
    super(config);
  }

  get telemetryButton() {
    return this._telemetryButton;
  }

  activateTelemetryIcon() {
    this._telemetryButton?.setImage(Constants.IMAGE_BUTTONS.telemetryActive).subscribe();
  }

  deactivateTelemetryIcon() {
    this._telemetryButton?.setImage(Constants.IMAGE_BUTTONS.telemetryInactive).subscribe();
  }

  addTelemetryButton(listening: boolean) {
    const icon = listening ? Constants.IMAGE_BUTTONS.telemetryInactive : Constants.IMAGE_BUTTONS.telemetryDisabled;
    this._telemetryButton = new ImageButton({
      ...icon,
      listening,
    });

    this.addTimelineNode({
      timelineNode: this._telemetryButton,
      width: this._telemetryButton.config.width!,
      height: this._telemetryButton.config.height!,
      justify: 'start',
      margin: [0, 5, 0, 0],
    });
  }
}
