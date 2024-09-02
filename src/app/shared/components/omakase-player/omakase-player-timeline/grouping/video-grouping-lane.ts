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

import {ConfigWithOptionalStyle, Timeline} from '@byomakase/omakase-player';
import {VideoMediaTrack} from '../../../../../model/domain.model';
import {BaseGroupingLane, BaseGroupingLaneConfig} from './base-grouping-lane';
import {VideoControllerApi} from '@byomakase/omakase-player/dist/video/video-controller-api';

export interface VideoGroupingLaneConfig extends BaseGroupingLaneConfig {
  videoMediaTrack: VideoMediaTrack;
}

export class VideoGroupingLane extends BaseGroupingLane<VideoGroupingLaneConfig> {
  private _videoMediaTrack: VideoMediaTrack;

  constructor(config: ConfigWithOptionalStyle<VideoGroupingLaneConfig>) {
    super(config);

    this._videoMediaTrack = config.videoMediaTrack;

  }

  override prepareForTimeline(timeline: Timeline, videoController: VideoControllerApi) {
    super.prepareForTimeline(timeline, videoController);

    this.updateStyles()

  }

  private updateStyles() {

  }
}
