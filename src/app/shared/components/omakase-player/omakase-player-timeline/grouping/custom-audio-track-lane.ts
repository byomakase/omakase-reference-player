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

import {AudioTrackLane, AudioTrackLaneConfig, ConfigWithOptionalStyle, Timeline} from '@byomakase/omakase-player';
import {AudioMediaTrack, VisualReference} from '../../../../../model/domain.model';
import {VideoControllerApi} from '@byomakase/omakase-player/dist/video/video-controller-api';

export interface CustomAudioTrackLaneConfig extends AudioTrackLaneConfig {
  audioMediaTrack: AudioMediaTrack;
}

export class CustomAudioTrackLane extends AudioTrackLane {
  private _audioMediaTrack: AudioMediaTrack
  private _waveformVisualReference?: VisualReference;

  constructor(config: ConfigWithOptionalStyle<CustomAudioTrackLaneConfig>) {
    super(config);

    this._audioMediaTrack = config.audioMediaTrack;

    this._waveformVisualReference = this._audioMediaTrack.visual_reference ? this._audioMediaTrack.visual_reference.find(p => p.type === 'waveform') : void 0;

    this.vttUrl = this._waveformVisualReference?.url;
  }

  override prepareForTimeline(timeline: Timeline, videoController: VideoControllerApi) {
    super.prepareForTimeline(timeline, videoController);

    this.updateStyles()
  }

  private updateStyles() {

  }
}
