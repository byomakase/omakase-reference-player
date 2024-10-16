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

import {Injectable} from '@angular/core';
import {IconChevronDown} from './svg/icon-chevron-down';
import {IconChevronRight} from './svg/icon-chevron-right';
import {IconCode} from './svg/icon-code';
import {IconVolume} from './svg/icon-volume';
import {IconVolumeMuted} from './svg/icon-volume-muted';
import {IconVolumeLow} from './svg/icon-volume-low';
import {IconArrowDown} from './svg/icon-arrow-down';
import {IconCorners} from './svg/icon-corners';
import {IconPlay} from './svg/icon-play';
import {IconPause} from './svg/icon-pause';
import {IconRewind} from './svg/icon-rewind';
import {IconFastRewind} from './svg/icon-fast-rewind';
import {IconForward} from './svg/icon-forward';
import {IconFastForward} from './svg/icon-fast-forward';
import {IconVolumeZero} from './svg/icon-volume-zero';
import {IconTelemetry} from './svg/icon-telemetry';
import {IconWarning} from './svg/icon-warning';
import {IconInfo} from './svg/icon-info';
import {IconClose} from './svg/icon-close';
import {IconSafezoneOn} from './svg/icon-safezone-on';
import {IconSafezoneOff} from './svg/icon-safezone-off';
import {IconCheckboxChecked} from './svg/icon-checkbox-checked';
import {IconCheckboxUnchecked} from './svg/icon-checkbox-unchecked';

export type IconName =
  'arrow-down'
  | 'chevron-down'
  | 'chevron-right'
  | 'code'
  | 'corners'

  | 'volume'
  | 'volume-zero'
  | 'volume-low'
  | 'volume-muted'

  | 'play'
  | 'pause'
  | 'rewind'
  | 'fast-rewind'
  | 'forward'
  | 'fast-forward'

  | 'telemetry'
  | 'warning'
  | 'info'
  | 'close'

  | 'safezone-on'
  | 'safezone-off'
  | 'checkbox-checked'
  | 'checkbox-unchecked'

  ;


@Injectable({
  providedIn: 'root'
})
export class IconService {

  private _icons: Record<IconName, string> = {
    'arrow-down': IconArrowDown,
    'chevron-down': IconChevronDown,
    'chevron-right': IconChevronRight,
    'code': IconCode,
    'corners': IconCorners,

    'volume': IconVolume,
    'volume-zero': IconVolumeZero,
    'volume-low': IconVolumeLow,
    'volume-muted': IconVolumeMuted,

    'play': IconPlay,
    'pause': IconPause,
    'rewind': IconRewind,
    'fast-rewind': IconFastRewind,
    'forward': IconForward,
    'fast-forward': IconFastForward,

    'telemetry': IconTelemetry,
    'warning': IconWarning,
    'info': IconInfo,
    'close': IconClose,

    'safezone-on': IconSafezoneOn,
    'safezone-off': IconSafezoneOff,
    'checkbox-checked': IconCheckboxChecked,
    'checkbox-unchecked': IconCheckboxUnchecked

  }

  constructor() {
  }

  getIconHtml(name: IconName): string {
    return this._icons[name];
  }

  get icons(): Record<IconName, string> {
    return this._icons;
  }
}
