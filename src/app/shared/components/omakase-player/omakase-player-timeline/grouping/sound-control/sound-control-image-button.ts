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
import {SoundControl, SoundControlState} from './sound-control';

export interface SoundControlConfig {
  state: SoundControlState;
  srcDefault: string;
  srcActive: string;
  srcMuted: string;
  srcDisabled: string;
  width: number;
  height: number;
}

export class SoundControlImageButton implements SoundControl {
  private _config: SoundControlConfig;
  private _button: ImageButton;
  private _state: SoundControlState;

  constructor(config: SoundControlConfig) {
    this._config = config;
    this._state = this._config.state;
    this._button = new ImageButton({
      src: this.resolveButtonSrc(this._config.state),
      width: this._config.width,
      height: this._config.height,
      listening: true,
    });
  }

  protected resolveButtonSrc(state: SoundControlState): string {
    switch (state) {
      case 'default':
        return this._config.srcDefault;
      case 'active':
        return this._config.srcActive;
      case 'muted':
        return this._config.srcMuted;
      case 'disabled':
        return this._config.srcDisabled;
    }
  }

  set state(value: SoundControlState) {
    this._state = value;

    let src = this.resolveButtonSrc(this._state);

    this._button.setImage({
      src: src,
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
