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

import {AudioTrackLane, AudioTrackLaneConfig, ClickEvent, ConfigWithOptionalStyle, OmpAudioTrack, TextLabel, Timeline, VideoControllerApi} from '@byomakase/omakase-player';
import {AudioMediaTrack, VisualReference} from '../../../../../model/domain.model';
import {StringUtil} from '../../../../../util/string-util';
import {filter, merge, Observable, switchMap, take, takeUntil} from 'rxjs';
import {SoundControlTextButton} from './sound-control/sound-control-text-button';
import {Constants} from '../../../../constants/constants';
import {LayoutService} from '../../../../../core/layout/layout.service';
import {WindowService} from '../../../../../core/browser/window.service';
import {AudioGroupingLane} from './audio-grouping-lane';
import {errorCompleteObserver, nextCompleteObserver, passiveObservable} from '../../../../../util/rx-util';

export interface AudioChannelLaneConfig extends AudioTrackLaneConfig {
  audioMediaTrack: AudioMediaTrack;
  visualReference: VisualReference;
  audioGroupingLane: AudioGroupingLane;
  channelIndex: number;
  channelsCount: number;
  isSidecar: boolean;
}

export class AudioChannelLane extends AudioTrackLane {
  private _audioTrack?: OmpAudioTrack;

  private _audioMediaTrack: AudioMediaTrack;
  private _visualReference: VisualReference;
  private _audioGroupingLane: AudioGroupingLane;
  private _channelOrderLabel?: TextLabel | undefined;
  private _soundControlSolo?: SoundControlTextButton;
  private _soundControlMute?: SoundControlTextButton;

  private _isSoloed: boolean = false;
  private _isMuted: boolean = false;
  private _isSidecar: boolean = false;

  constructor(
    config: ConfigWithOptionalStyle<AudioChannelLaneConfig>,
    protected windowService: WindowService
  ) {
    super(config);

    this._audioMediaTrack = config.audioMediaTrack;
    this._visualReference = config.visualReference;
    this._audioGroupingLane = config.audioGroupingLane;

    if (config.visualReference.type === 'waveform') {
      this.vttUrl = this._visualReference.url;
    }

    if (config.isSidecar) {
      this._isSidecar = config.isSidecar;
    }
  }

  override prepareForTimeline(timeline: Timeline, videoController: VideoControllerApi) {
    super.prepareForTimeline(timeline, videoController);

    if ((this._config as AudioChannelLaneConfig).channelsCount > 1) {
      if (this.windowService.userAgent !== 'safari') {
        this._soundControlSolo = new SoundControlTextButton({
          text: 'S',
          state: 'disabled',
          width: 22,
          height: 20,
        });

        this._soundControlMute = new SoundControlTextButton({
          text: 'M',
          state: 'disabled',
          width: 22,
          height: 20,
        });

        this.addTimelineNode({
          timelineNode: this._soundControlMute.timelineNode,
          width: this._soundControlMute.dimension.width,
          height: this._soundControlMute.dimension.height,
          justify: 'end',
          margin: [0, 5, 0, 0],
        });

        this.addTimelineNode({
          timelineNode: this._soundControlSolo.timelineNode,
          width: this._soundControlSolo.dimension.width,
          height: this._soundControlSolo.dimension.height,
          justify: 'end',
          margin: [0, 10, 0, 0],
        });
      }

      let channelOrderText = StringUtil.isNonEmpty(this._visualReference.channel) ? this._visualReference!.channel!.toUpperCase() : `C${(this._config as AudioChannelLaneConfig).channelIndex + 1}`;
      this._channelOrderLabel = new TextLabel({
        text: channelOrderText,
        style: {
          ...Constants.TEXT_LABEL_STYLE,
          ...LayoutService.themeStyleConstants.TEXT_LABEL_STYLE_COLORS,
          align: 'right',
        },
      });

      this.addTimelineNode({
        timelineNode: this._channelOrderLabel,
        width: 22,
        height: 20,
        justify: 'end',
        margin: [0, 10, 0, 0],
      });
    }

    merge(
      this._videoController!.onAudioLoaded$,
      this._videoController!.onAudioSwitched$,
      this._videoController!.onVolumeChange$,
      this._videoController!.onAudioOutputVolumeChange$,
      this._videoController!.onSidecarAudioChange$
    )
      .pipe(switchMap((value) => [value])) // // each new emission switches to latest, racing observables
      .pipe(takeUntil(this._destroyed$))
      .subscribe({
        next: (event) => {
          this.updateStyles();
        },
      });

    this._videoController!.onSidecarAudioInputSoloMute$.pipe(takeUntil(this._destroyed$)).subscribe({
      next: (event) => {
        const audioRouterInputSoloMuteState = event?.sidecarAudioInputSoloMuteStates.find((state) => state.audioTrack.id === this._audioMediaTrack.media_id)?.audioRouterInputSoloMuteState;
        // debugger;
        if (audioRouterInputSoloMuteState) {
          if (audioRouterInputSoloMuteState.inputNumber === this.channelIndex) {
            this._isSoloed = audioRouterInputSoloMuteState.soloed;
            this._isMuted = audioRouterInputSoloMuteState.muted;
          }
        } else {
          this._isSoloed = false;
          this._isMuted = false;
        }

        this.updateStyles();
      },
    });

    if (!this._isSidecar) {
      this._videoController!.onMainAudioInputSoloMute$.pipe(takeUntil(this._destroyed$)).subscribe({
        next: (event) => {
          const audioRouterInputSoloMuteState = event?.mainAudioInputSoloMuteState.audioRouterInputSoloMuteState;
          if (audioRouterInputSoloMuteState) {
            if (audioRouterInputSoloMuteState.inputNumber === this.channelIndex) {
              this._isSoloed = audioRouterInputSoloMuteState.soloed;
              this._isMuted = audioRouterInputSoloMuteState.muted;
            }
          } else {
            this._isSoloed = false;
            this._isMuted = false;
          }

          this.updateStyles();
        },
      });
    }

    this._soundControlSolo?.timelineNode.onClick$
      .pipe(
        filter(() => !this.isDisabled),
        takeUntil(this._destroyed$)
      )
      .subscribe({
        next: (event: ClickEvent) => {
          this.setAsActiveAudioTrack()
            .pipe(take(1))
            .subscribe({
              next: () => {
                if (this.isSidecar) {
                  this._videoController!.toggleSidecarAudioRouterSolo(this._audioTrack!.id, {input: this.channelIndex});
                } else {
                  this._videoController!.toggleMainAudioRouterSolo({input: this.channelIndex});
                }
              },
            });
        },
      });

    this._soundControlSolo?.timelineNode.onMouseEnter$.pipe(takeUntil(this._destroyed$)).subscribe({
      next: () => {
        document.body.style.cursor = this.isDisabled ? 'default' : 'pointer';
      },
    });

    this._soundControlMute?.timelineNode.onClick$
      .pipe(
        filter(() => !this.isDisabled),
        takeUntil(this._destroyed$)
      )
      .subscribe({
        next: (event: ClickEvent) => {
          this.setAsActiveAudioTrack()
            .pipe(take(1))
            .subscribe({
              next: () => {
                if (this.isSidecar) {
                  this._videoController!.toggleSidecarAudioRouterMute(this._audioTrack!.id, {input: this.channelIndex});
                } else {
                  this._videoController!.toggleMainAudioRouterMute({input: this.channelIndex});
                }
              },
            });
        },
      });

    this._soundControlMute?.timelineNode.onMouseEnter$.pipe(takeUntil(this._destroyed$)).subscribe({
      next: () => {
        document.body.style.cursor = this.isDisabled ? 'default' : 'pointer';
      },
    });
  }

  setAsActiveAudioTrack(toggleMuteIfActive = true): Observable<void> {
    return passiveObservable((observer) => {
      if (!this.isActive) {
        let o$: Observable<void>;
        if (this.isSidecar) {
          o$ = this._videoController!.updateSidecarAudioRouterConnections(
            this.audioMediaTrack.media_id,
            this._videoController!.getSidecarAudioRouterInitialRoutingConnections(this.audioMediaTrack.media_id)!
          );
        } else {
          o$ = this._videoController!.updateMainAudioRouterConnections(this._videoController!.getMainAudioRouterInitialRoutingConnections()!);
        }
        this._audioGroupingLane
          .setAsActiveAudioTrack(toggleMuteIfActive)
          .pipe(take(1))
          .subscribe({
            next: () => {
              o$.subscribe(() => nextCompleteObserver(observer));
              nextCompleteObserver(observer);
            },
            error: (error) => {
              errorCompleteObserver(observer, error);
            },
          });
      } else {
        nextCompleteObserver(observer);
      }
    });
  }

  private updateStyles() {
    if (!this._videoController) {
      return;
    }

    let isMuted = this._videoController.isAudioOutputMuted();

    if (this.isActive) {
      this.style = {
        ...Constants.LABEL_LANE_STYLE,
        ...LayoutService.themeStyleConstants.LABEL_LANE_STYLE_COLORS,
      };

      if (this._soundControlSolo) {
        this._soundControlSolo.state = this.isSoloed ? (isMuted ? 'disabled' : 'active') : 'default';
      }
      if (this._soundControlMute) {
        this._soundControlMute.state = this.isMuted ? (isMuted ? 'disabled' : 'active') : 'default';
      }
    } else {
      this.style = {...Constants.LABEL_LANE_STYLE, ...LayoutService.themeStyleConstants.LABEL_LANE_STYLE_COLORS};

      if (this._soundControlSolo) {
        this._soundControlSolo.state = this.isDisabled ? 'disabled' : 'default';
      }
      if (this._soundControlMute) {
        this._soundControlMute.state = this.isDisabled ? 'disabled' : 'default';
      }
    }
  }

  get isDisabled(): boolean {
    return !this._audioTrack;
  }

  get isActive(): boolean {
    if (this.isSidecar) {
      return this.isSidecarActive;
    }
    let currentAudioTrack = this._videoController!.getActiveAudioTrack();
    return !!currentAudioTrack && !!this._audioTrack && this._audioTrack.id === currentAudioTrack.id && !this._videoController!.isMuted();
  }

  get activeTrack() {
    if (this._videoController!.isMuted()) {
      return this._videoController!.getActiveSidecarAudioTracks().at(0);
    } else {
      return this._videoController!.getActiveAudioTrack();
    }
  }

  get isSidecarActive() {
    return (
      !!this._audioTrack &&
      !!this._videoController
        ?.getActiveSidecarAudioTracks()
        .map((track) => track.id)
        .includes(this._audioTrack.id)
    );
  }

  get audioMediaTrack(): AudioMediaTrack {
    return this._audioMediaTrack;
  }

  get audioTrack(): OmpAudioTrack | undefined {
    return this._audioTrack;
  }

  get name(): string {
    return this._audioMediaTrack.media_id;
  }

  set audioTrack(value: OmpAudioTrack | undefined) {
    this._audioTrack = value;
    this.updateStyles();
  }

  get channelIndex(): number {
    return (this._config as AudioChannelLaneConfig).channelIndex;
  }

  get isSoloed(): boolean {
    return this._isSoloed;
  }

  get isMuted(): boolean {
    return this._isMuted;
  }

  get isSidecar(): boolean {
    return this._isSidecar;
  }
}
