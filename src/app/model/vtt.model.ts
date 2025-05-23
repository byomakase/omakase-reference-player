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

export interface VttCueParsed {
  identifier: string;
  start: number;
  end: number;
  text: string;
  styles: string;
}

export interface VttFileMetaParsed {
  kind: string;
  language: string;
}

export interface VttFileParsed {
  valid: any;
  meta: VttFileMetaParsed;
  cues: VttCueParsed[];
}

export interface AppVttCue {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  vttCue?: VTTCue;
}

export interface AppMarkerVttCue extends AppVttCue {}

export interface AppChartVttCue extends AppVttCue {}
