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

import {AppChartVttCue, AppMarkerVttCue, AppVttCue, VttCueParsed, VttFileParsed} from '../../model/vtt.model';
import {VttUtil} from '../../util/vtt-util';

export interface AppVttFile<T extends AppVttCue> {
  get cues(): T[];

  findCue(time: number): T | undefined;

  findCues(startTime: number, endTime: number): T[];
}

export abstract class BaseAppVttFile<T extends AppVttCue> implements AppVttFile<T> {
  private _cues: Map<number, T> = new Map<number, T>();
  private _cuesKeysSorted: number[] = [];

  protected constructor(vttFileText: string) {
    try {
      let vttFileParsed: VttFileParsed = VttUtil.parse(vttFileText);

      vttFileParsed.cues.forEach((parsedCue) => {
        let cue = this.mapCue(parsedCue);
        this._cues.set(cue.startTime, cue);
        this._cuesKeysSorted.push(cue.startTime);
      });
    } catch (e) {
      console.error(e);
    }

    this._cuesKeysSorted.sort((a, b) => {
      return a - b;
    });
  }

  protected abstract mapCue(vttCueParsed: VttCueParsed): T;

  get cues(): T[] {
    return [...this._cues.values()];
  }

  hasCues() {
    return this._cues && this._cues.size > 0;
  }

  findCue(time: number): T | undefined {
    let cues = this.findCues(time, time);
    if (cues && cues.length === 1) {
      return cues[0];
    } else {
      return void 0;
    }
  }

  findCues(startTime: number, endTime: number): T[] {
    let startIndex = this.findCueIndex(startTime);
    let endIndex = this.findCueIndex(endTime);
    if (endIndex === -1) {
      return [];
    }
    return this._cuesKeysSorted
      .slice(startIndex, endIndex + 1)
      .map((startTime) => this._cues.get(startTime))
      .filter((p) => p !== undefined) as T[];
  }

  protected findCueIndex(time: number): number {
    let startIndex = 0;
    let endIndex = this._cuesKeysSorted.length - 1;
    while (startIndex <= endIndex) {
      const mid = Math.floor((startIndex + endIndex) / 2);
      if (this._cuesKeysSorted[mid] === time) {
        return mid;
      } else if (this._cuesKeysSorted[mid] < time) {
        startIndex = mid + 1;
      } else {
        endIndex = mid - 1;
      }
    }
    if (endIndex === -1) {
      endIndex = 0;
    }
    return endIndex;
  }
}

export class MarkerVttFile extends BaseAppVttFile<AppMarkerVttCue> {
  constructor(vttFileText: string) {
    super(vttFileText);
  }

  protected override mapCue(vttCueParsed: VttCueParsed): AppMarkerVttCue {
    let cue = {
      id: vttCueParsed.identifier,
      startTime: vttCueParsed.start,
      endTime: vttCueParsed.end,
      text: vttCueParsed.text,
    };

    return cue;
  }
}

export class ChartVttFile extends BaseAppVttFile<AppChartVttCue> {
  constructor(vttFileText: string) {
    super(vttFileText);
  }

  protected override mapCue(vttCueParsed: VttCueParsed): AppChartVttCue {
    let cue = {
      id: vttCueParsed.identifier,
      startTime: vttCueParsed.start,
      endTime: vttCueParsed.end,
      text: vttCueParsed.text,
    };

    return cue;
  }
}
