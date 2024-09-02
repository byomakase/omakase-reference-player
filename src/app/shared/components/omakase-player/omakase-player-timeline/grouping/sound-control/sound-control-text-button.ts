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

import {TextLabel} from '@byomakase/omakase-player';
import {SoundControl, SoundControlState} from './sound-control';
import {Constants} from '../../../../../constants/constants';
import {TimelineNode} from '@byomakase/omakase-player/dist/timeline/timeline-component';
import {CanvasUtil} from '../../../../../../util/canvas-util';
import {Dimension} from '@byomakase/omakase-player/dist/common/measurement';

export interface SoundControlTextButtonConfig {
  text: string;
  disabled: boolean;
  width: number;
  height: number;
}

export class SoundControlTextButton implements SoundControl {
  private _config: SoundControlTextButtonConfig;
  private _textLabel: TextLabel;
  private _state: SoundControlState;

  constructor(config: SoundControlTextButtonConfig) {
    this._config = config;
    this._state = this._config.disabled ? 'disabled' : 'default';
    this._textLabel = new TextLabel({
      text: this._config.text,
      listening: !this._config.disabled,
      style: {
        ...(this._config.disabled ? Constants.TEXT_LABEL_BUTTON_DISABLED_STYLE : Constants.TEXT_LABEL_BUTTON_STYLE),
      }
    });
  }

  set state(value: SoundControlState) {
    this._state = value;

    switch (this._state) {
      case 'default':
        this._textLabel.style = {
          ...Constants.TEXT_LABEL_BUTTON_STYLE
        }
        break;
      case 'active':
        this._textLabel.style = {
          ...Constants.TEXT_LABEL_BUTTON_ACTIVE_STYLE
        }
        break;
      case 'disabled':
        this._textLabel.style = {
          ...Constants.TEXT_LABEL_BUTTON_DISABLED_STYLE
        }
        break;
    }

    switch (this._state) {
      case 'muted':
        this._textLabel.konvaNode.clipFunc(CanvasUtil.createCrossedRectClipFunc(this._config.width, this._config.height, 3))
        break;
      default:
        // @ts-ignore
        this._textLabel.konvaNode.clipFunc(void 0)
        break;
    }
  }

  get timelineNode(): TimelineNode {
    return this._textLabel;
  }

  get dimension(): Dimension {
    return {
      width: this._config.width,
      height: this._config.height
    }
  }
}
