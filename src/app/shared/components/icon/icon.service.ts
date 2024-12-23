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
import {IconDetach} from './svg/icon-detach';
import {IconAttach} from './svg/icon-attach';
import {IconPlayForward3} from './svg/icon-fw';
import {IconPlayBack3} from './svg/icon-back';
import {IconAdd} from './svg/icon-add';
import {IconMarkerStart} from './svg/icon-marker-start';
import {IconMarkerEnd} from './svg/icon-marker-end';
import {IconPoint} from './svg/icon-point';
import {IconMarkerDelete} from './svg/icon-marker-delete';
import {IconBracketDoubleLeft} from './svg/icon-bracket-double-left';
import {IconBracketDoubleRight} from './svg/icon-bracket-double-right';
import {IconBracketRight} from './svg/icon-bracket-right';
import {IconBracketLeft} from './svg/icon-bracket-left';
import {IconArrowLeft} from './svg/icon-arrow-left';
import {IconArrowRight} from './svg/icon-arrow-right';
import {IconArrowUp} from './svg/icon-arrow-up';
import {IconArrowDownLight} from './svg/icon-arrow-down-light';
import {IconStatus} from './svg/icon-status';
import {IconMarkerSplit} from './svg/icon-marker-split';
import {IconConfirm} from './svg/icon-confirm';
import {IconReject} from './svg/icon-reject';
import {IconLoop} from './svg/icon-loop';
import {IconPdf} from './svg/icon-pdf';
import {IconJson} from './svg/icon-json';
import {IconTxt} from './svg/icon-txt';
import {IconDownload} from './svg/icon-download';
import {IconCsv} from './svg/icon-csv';
import {IconBinary} from './svg/icon-binary';
import {IconToastError} from './svg/icon-toast-error';
import {IconToastWarning} from './svg/icon-toast-warning';
import {IconToastSuccess} from './svg/icon-toast-success';

export type IconName =
  | 'arrow-down'
  | 'arrow-up'
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
  | 'detach'
  | 'attach'
  | 'add'
  | 'telemetry'
  | 'warning'
  | 'info'
  | 'close'
  | 'safezone-on'
  | 'safezone-off'
  | 'checkbox-checked'
  | 'checkbox-unchecked'
  | 'play-forward-3'
  | 'play-back-3'
  | 'arrow-left'
  | 'arrow-right'
  | 'arrow-down-light'
  | 'status'
  | 'marker-start'
  | 'marker-end'
  | 'marker-delete'
  | 'marker-split'
  | 'point'
  | 'bracket-double-right'
  | 'bracket-double-left'
  | 'bracket-right'
  | 'bracket-left'
  | 'confirm'
  | 'reject'
  | 'loop'
  | 'pdf'
  | 'json'
  | 'txt'
  | 'csv'
  | 'binary'
  | 'download'
  | 'toast-success'
  | 'toast-warning'
  | 'toast-error';

@Injectable({
  providedIn: 'root',
})
export class IconService {
  private _icons: Record<IconName, string> = {
    'arrow-down': IconArrowDown,
    'arrow-up': IconArrowUp,
    'chevron-down': IconChevronDown,
    'chevron-right': IconChevronRight,
    'code': IconCode,
    'corners': IconCorners,
    'pdf': IconPdf,
    'json': IconJson,
    'txt': IconTxt,
    'csv': IconCsv,
    'binary': IconBinary,
    'download': IconDownload,

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
    'detach': IconDetach,
    'attach': IconAttach,
    'play-forward-3': IconPlayForward3,
    'play-back-3': IconPlayBack3,
    'add': IconAdd,
    'loop': IconLoop,

    'telemetry': IconTelemetry,
    'warning': IconWarning,
    'info': IconInfo,
    'close': IconClose,

    'safezone-on': IconSafezoneOn,
    'safezone-off': IconSafezoneOff,
    'checkbox-checked': IconCheckboxChecked,
    'checkbox-unchecked': IconCheckboxUnchecked,

    'marker-start': IconMarkerStart,
    'marker-end': IconMarkerEnd,
    'marker-delete': IconMarkerDelete,
    'marker-split': IconMarkerSplit,
    'point': IconPoint,
    'bracket-double-left': IconBracketDoubleLeft,
    'bracket-double-right': IconBracketDoubleRight,
    'bracket-right': IconBracketRight,
    'bracket-left': IconBracketLeft,
    'arrow-left': IconArrowLeft,
    'arrow-right': IconArrowRight,
    'arrow-down-light': IconArrowDownLight,
    'status': IconStatus,
    'confirm': IconConfirm,
    'reject': IconReject,

    'toast-error': IconToastError,
    'toast-warning': IconToastWarning,
    'toast-success': IconToastSuccess,
  };

  constructor() {}

  getIconHtml(name: IconName): string {
    return this._icons[name];
  }

  get icons(): Record<IconName, string> {
    return this._icons;
  }
}
