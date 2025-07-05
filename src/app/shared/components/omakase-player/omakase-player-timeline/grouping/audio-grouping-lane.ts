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

import {ClickEvent, ConfigWithOptionalStyle, OmpAudioRoutingConnection, OmpAudioTrack, TextLabel, Timeline, VideoControllerApi} from '@byomakase/omakase-player';
import {AudioMediaTrack, ChannelType} from '../../../../../model/domain.model';
import {combineLatest, filter, forkJoin, map, merge, Observable, Subject, switchMap, take, takeUntil} from 'rxjs';
import {BaseGroupingLane, BaseGroupingLaneConfig} from './base-grouping-lane';
import {SoundControlImageButton} from './sound-control/sound-control-image-button';
import {DomainUtil} from '../../../../../util/domain-util';
import {Constants} from '../../../../constants/constants';
import {LayoutService} from '../../../../../core/layout/layout.service';
import {AudioChannelLane} from './audio-channel-lane';
import {completeSub, errorCompleteObserver, nextCompleteObserver, passiveObservable} from '../../../../../util/rx-util';
import {error} from '@angular/compiler-cli/src/transformers/util';

export interface AudioGroupingLaneConfig extends BaseGroupingLaneConfig {
  audioMediaTrack: AudioMediaTrack;
  isSidecar: boolean;
}

export class AudioGroupingLane extends BaseGroupingLane<AudioGroupingLaneConfig> {
  private _audioTrack?: OmpAudioTrack;
  private _audioMediaTrack: AudioMediaTrack;
  private _soundControlButton?: SoundControlImageButton;
  private _soundLabelButton?: TextLabel | undefined;
  private _languageLabel?: TextLabel | undefined;
  private _isSidecar = false;

  constructor(config: ConfigWithOptionalStyle<AudioGroupingLaneConfig>) {
    super({
      ...config,
      style: {
        ...Constants.LABEL_LANE_STYLE,
        ...LayoutService.themeStyleConstants.LABEL_LANE_STYLE_COLORS,
      },
    });
    this._audioMediaTrack = config.audioMediaTrack;
    if (config.isSidecar) {
      this._isSidecar = true;
    }
  }

  override prepareForTimeline(timeline: Timeline, videoController: VideoControllerApi) {
    super.prepareForTimeline(timeline, videoController);

    this._soundControlButton = new SoundControlImageButton({
      state: 'disabled',
      srcDefault: LayoutService.themeStyleConstants.IMAGE_BUTTONS.soundHorn.src,
      srcActive: LayoutService.themeStyleConstants.IMAGE_BUTTONS.soundHornActive.src,
      srcDisabled: LayoutService.themeStyleConstants.IMAGE_BUTTONS.soundHornDisabled.src,
      srcMuted: LayoutService.themeStyleConstants.IMAGE_BUTTONS.soundHornMuted.src,
      width: 26,
      height: 26,
    });

    if (this._audioMediaTrack.language) {
      let text = this._audioMediaTrack.language!.toUpperCase();
      this._languageLabel = new TextLabel({
        text: text,
        style: {
          ...Constants.TEXT_LABEL_STYLE_2,
          ...LayoutService.themeStyleConstants.TEXT_LABEL_STYLE_2_COLORS,
        },
      });
    }

    this.addTimelineNode({
      timelineNode: this._soundControlButton.timelineNode,
      width: this._soundControlButton.dimension.width,
      height: this._soundControlButton.dimension.height,
      justify: 'start',
      margin: [0, this._soundLabelButton ? -4.5 : 5, 0, 0],
    });

    if (this._soundLabelButton) {
      this.addTimelineNode({
        timelineNode: this._soundLabelButton,
        width: 24,
        height: 20,
        justify: 'start',
        margin: [0, 5, 0, 0],
      });
    }

    if (this._languageLabel) {
      this.addTimelineNode({
        timelineNode: this._languageLabel,
        width: 22,
        height: 20,
        justify: 'start',
        margin: [0, 5, 0, 0],
      });
    }

    merge(
      this._videoController!.onAudioLoaded$,
      this._videoController!.onAudioSwitched$,
      this._videoController!.onVolumeChange$,
      this._videoController!.onAudioOutputVolumeChange$,
      this._videoController!.onSidecarAudioChange$
    )
      .pipe(switchMap((value) => [value])) // each new emission switches to latest, racing observables
      .pipe(takeUntil(this._destroyed$))
      .subscribe({
        next: (event) => {
          // if (this.isSidecar) {
          //   if (this._videoController!.getActiveSidecarAudioTracks().find((sc) => sc.id === this._audioMediaTrack.media_id) === undefined) {
          //     this._videoController!.updateSidecarAudioRouterConnections(
          //       this._audioMediaTrack.media_id,
          //       this._videoController!.getSidecarAudioRouterInitialRoutingConnections(this._audioMediaTrack.media_id)!
          //     );
          //   }
          // } else {
          //   if (this._videoController!.getActiveAudioTrack() !== this._audioTrack) {
          //     this._videoController!.updateMainAudioRouterConnections(this._videoController!.getMainAudioRouterInitialRoutingConnections()!);
          //   }
          // }
          this.updateStyles();
        },
      });

    this._soundControlButton.timelineNode.onMouseEnter$.pipe(takeUntil(this._destroyed$)).subscribe({
      next: () => {
        document.body.style.cursor = this.isDisabled ? 'default' : 'pointer';
      },
    });

    this._soundControlButton.timelineNode.onClick$
      .pipe(
        filter(() => !this.isDisabled),
        takeUntil(this._destroyed$)
      )
      .subscribe({
        next: (event) => {
          this.setAsActiveAudioTrack();
        },
      });

    this._soundLabelButton?.onMouseEnter$.pipe(takeUntil(this._destroyed$)).subscribe({
      next: () => {
        document.body.style.cursor = this.isDisabled ? 'default' : 'pointer';
      },
    });

    this._soundLabelButton?.onClick$
      .pipe(
        filter(() => !this.isDisabled),
        takeUntil(this._destroyed$)
      )
      .subscribe({
        next: (event: ClickEvent) => {
          this.setAsActiveAudioTrack();
        },
      });

    this._textLabel!.onMouseEnter$.pipe(takeUntil(this._destroyed$)).subscribe({
      next: () => {
        document.body.style.cursor = this.isDisabled ? 'default' : 'pointer';
      },
    });

    this._textLabel!.onClick$.pipe(
      filter(() => !this.isDisabled),
      takeUntil(this._destroyed$)
    ).subscribe({
      next: (event) => {
        event.cancelableEvent.cancelBubble = true;
        this.setAsActiveAudioTrack();
      },
    });
  }

  private updateStyles() {
    if (!this._videoController) {
      return;
    }

    let isMuted = this._videoController!.isAudioOutputMuted();

    if (this.isActive) {
      if (isMuted) {
        this.style = {
          ...Constants.LABEL_LANE_STYLE,
          ...LayoutService.themeStyleConstants.LABEL_LANE_STYLE_COLORS,
        };
      } else {
        this.style = {
          ...Constants.LABEL_LANE_STYLE_ACTIVE,
          ...LayoutService.themeStyleConstants.LABEL_LANE_STYLE_ACTIVE_COLORS,
        };
      }
    } else {
      this.style = {
        ...Constants.LABEL_LANE_STYLE,
        ...LayoutService.themeStyleConstants.LABEL_LANE_STYLE_COLORS,
      };
    }

    if (this.isActive) {
      if (this._soundLabelButton) {
        if (isMuted) {
          this._soundLabelButton.style = {
            ...Constants.SOUND_LABEL_BUTTON_STYLE,
            ...LayoutService.themeStyleConstants.SOUND_LABEL_BUTTON_DISABLED_STYLE_COLORS,
          };
        } else {
          this._soundLabelButton.style = {
            ...Constants.SOUND_LABEL_BUTTON_ACTIVE_STYLE,
            ...LayoutService.themeStyleConstants.SOUND_LABEL_BUTTON_ACTIVE_STYLE_COLORS,
          };
        }
      }

      if (this._soundControlButton) {
        this._soundControlButton.state = isMuted ? 'muted' : 'active';
      }
    } else {
      if (this._soundLabelButton) {
        this._soundLabelButton.style = {
          ...Constants.SOUND_LABEL_BUTTON_STYLE,
          ...LayoutService.themeStyleConstants.SOUND_LABEL_BUTTON_STYLE_COLORS,
        };
      }
      if (this._soundControlButton) {
        this._soundControlButton.state = this.isDisabled ? 'disabled' : 'default';
      }
    }
  }

  setAsActiveAudioTrack(toggleMuteIfActive = true): Observable<void> {
    return passiveObservable((observer) => {
      if (this.isSidecar) {
        if (this._videoController!.getActiveSidecarAudioTracks().find((activeSidecar) => activeSidecar.id === this._audioTrack!.id)) {
          if (toggleMuteIfActive) {
            this._videoController!.deactivateSidecarAudioTracks([this._audioTrack!.id]).subscribe(() => {
              nextCompleteObserver(observer);
            });
          } else {
            this._videoController!.updateSidecarAudioRouterConnections(
              this.audioMediaTrack.media_id,
              this._videoController!.getSidecarAudioRouterInitialRoutingConnections(this.audioMediaTrack.media_id)!
            ).subscribe(() => nextCompleteObserver(observer));
          }
        } else {
          const o1$ = this._videoController!.activateSidecarAudioTracks([this._audioTrack!.id], true);
          const o2$ = this._videoController!.mute();
          const o3$ = this._videoController!.updateSidecarAudioRouterConnections(
            this.audioMediaTrack.media_id,
            this._videoController!.getSidecarAudioRouterInitialRoutingConnections(this.audioMediaTrack.media_id)!
          );
          forkJoin([o1$, o2$, o3$]).subscribe({
            next: () => {
              nextCompleteObserver(observer);
            },
          });
        }
      } else {
        let currentAudioTrack = this._videoController!.getActiveAudioTrack();
        if (this._audioTrack === currentAudioTrack && this._videoController!.getActiveSidecarAudioTracks().length === 0) {
          const o$ = this._videoController!.deactivateSidecarAudioTracks(this._videoController!.getActiveSidecarAudioTracks().map((track) => track.id));

          if (toggleMuteIfActive) {
            (this._videoController!.isMuted() ? this._videoController!.unmute().pipe(map((p) => true)) : this._videoController!.mute().pipe(map((p) => true))).subscribe({
              next: () => {
                o$.subscribe(() => nextCompleteObserver(observer));
              },
              error: (error) => {
                errorCompleteObserver(observer, error);
              },
            });
          } else {
            o$.subscribe(() => nextCompleteObserver(observer));
          }
        } else {
          // select
          const o1$ = this._videoController!.setActiveAudioTrack(this._audioTrack!.id);
          const o2$ = this._videoController!.unmute();
          const o3$ = this._videoController!.deactivateSidecarAudioTracks(this._videoController!.getActiveSidecarAudioTracks().map((track) => track.id));
          const o4$ = this._videoController!.updateMainAudioRouterConnections(this._videoController!.getMainAudioRouterInitialRoutingConnections()!);
          forkJoin([o1$, o2$, o3$, o4$]).subscribe({
            next: () => {
              nextCompleteObserver(observer);
            },
            error: (error) => {
              errorCompleteObserver(observer, error);
            },
          });
        }
      }
    });
  }

  override destroy(): void {
    super.destroy();
  }

  get isDisabled(): boolean {
    return !this._audioTrack;
  }

  get isActive() {
    let currentAudioTrack = this._videoController!.getActiveAudioTrack();
    if (this.isSidecar) {
      return this._videoController?.getActiveSidecarAudioTracks().find((sidecar) => this._audioMediaTrack.media_id === sidecar.label);
    }
    return (currentAudioTrack?.id === this._audioTrack?.id || (!!currentAudioTrack && currentAudioTrack.label === this._audioMediaTrack.media_id)) && !this._videoController?.isMuted();
  }

  get audioTrack(): OmpAudioTrack | undefined {
    return this._audioTrack;
  }

  get isSidecar(): boolean {
    return this._isSidecar;
  }

  get audioMediaTrack(): AudioMediaTrack {
    return this._audioMediaTrack;
  }

  set audioTrack(value: OmpAudioTrack | undefined) {
    this._audioTrack = value;
    this.updateStyles();
  }

  get mediaTrackId() {
    return this._audioMediaTrack.id;
  }
}
