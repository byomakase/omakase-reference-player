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

import {Dimension, ImageButton, TimelineNode} from '@byomakase/omakase-player';
import {SubtitlesControl, SubtitlesControlState} from './subtitles-control';

export interface SubtitlesControlConfig {
  srcDefault: string;
  srcActive: string;
  srcDisabled: string;
  disabled: boolean;
  width: number;
  height: number;
}

export class SubtitlesControlImageButton implements SubtitlesControl {
  private _config: SubtitlesControlConfig;
  private _button: ImageButton;
  private _state: SubtitlesControlState;

  constructor(config: SubtitlesControlConfig) {
    this._config = config;
    this._state = this._config.disabled ? 'disabled' : 'default';
    this._button = new ImageButton({
      src: this._config.disabled ? this._config.srcDisabled : this._config.srcDefault,
      width: this._config.width,
      height: this._config.height,
      listening: !this._config.disabled,
    });
  }

  set state(value: SubtitlesControlState) {
    this._state = value;

    let newSrc: string | undefined;

    switch (this._state) {
      case 'default':
        newSrc = this._config.srcDefault;
        break;
      case 'active':
        newSrc = this._config.srcActive;
        break;
      case 'disabled':
        newSrc = this._config.srcDisabled;
        break;
    }

    this._button.setImage({
      src: newSrc,
      width: this._config.width,
      height: this._config.height,
    });
  }

  get timelineNode(): TimelineNode {
    return this._button;
  }

  get dimension(): Dimension {
    return {
      width: this._config.width,
      height: this._config.height,
    };
  }
}
