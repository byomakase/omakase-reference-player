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

import {Component, ElementRef, EventEmitter, HostBinding, Input, Output, Renderer2, RendererStyleFlags2, ViewChild} from '@angular/core';
import {NgbDropdownModule} from '@ng-bootstrap/ng-bootstrap';
import {JsonPipe} from '@angular/common';
import {IconModule} from '../icon/icon.module';
import {FormControl, FormGroup, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {filter, Subject, takeUntil} from 'rxjs';
import {IconName} from '../icon/icon.service';
import {completeSub} from '../../../util/rx-util';
import {MasterManifest} from '../../../model/domain.model';
import {OmakasePlayerUtil} from '../omakase-player/omakase-player-util';
import {OmpApiService} from '../omakase-player/omp-api.service';

interface ControlsState {
  seekingFfPrevious: boolean;
  seekingPrevious: boolean;
  seekingFfNext: boolean;
  seekingNext: boolean;
}

interface PlayerControlsFormGroup {
  volume: FormControl<number>;
}

@Component({
  selector: 'div[appPlayerControls]',
  standalone: true,
  imports: [NgbDropdownModule, JsonPipe, IconModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="col-4 d-flex justify-content-start">
      <div class="btn-group btn-group-speed" ngbDropdown role="group" [placement]="'top-start'">
        <button type="button" class="btn btn-primary btn-speed" ngbDropdownToggle>Speed: {{ playbackRate }}x <i appIcon="arrow-down"></i></button>
        <div class="dropdown-menu" ngbDropdownMenu>
          @for (playerPlaybackRate of playbackRateList; track playerPlaybackRate) {
            <button ngbDropdownItem (click)="buttonClickSetPlaybackRate(playerPlaybackRate)" class="text-center" [class.active]="playbackRate === playerPlaybackRate">
              {{ playerPlaybackRate }}
            </button>
          }
        </div>
      </div>
      <div class="volume-control">
        <button class="btn btn-link" (click)="buttonVolumeClick()" [disabled]="isDisabled">
          <i [appIcon]="volumeIcon"></i>
        </button>
        <input type="range" class="form-range" #volumeControlInput [min]="0" [max]="100" [formGroup]="playerControlsFormGroup" [formControl]="playerControlsFormGroup.controls.volume" />
      </div>
    </div>
    <div class="col-4 d-flex justify-content-center">
      <div class="btn-group btn-group-player-controls" role="group">
        <button type="button" class="btn btn-fast-rewind" (click)="buttonClickFfPreviousFrame()" [disabled]="isDisabled">
          <i appIcon="fast-rewind"></i>
        </button>
        <button type="button" class="btn" (click)="buttonClickPreviousFrame()" [disabled]="isDisabled">
          <i appIcon="rewind"></i>
        </button>
        <button type="button" class="btn btn-play-pause" (click)="buttonClickTogglePlayPause()" [disabled]="isDisabled">
          <i [appIcon]="isVideoPlaying ? 'pause' : 'play'"></i>
        </button>
        <button type="button" class="btn" (click)="buttonClickNextFrame()" [disabled]="isDisabled">
          <i appIcon="forward"></i>
        </button>
        <button type="button" class="btn btn-fast-forward" (click)="buttonClickFfNextFrame()" [disabled]="isDisabled">
          <i appIcon="fast-forward"></i>
        </button>
      </div>
    </div>
    <div class="col-4 d-flex justify-content-end">
      @if (showManifests) {
        <div class="btn-group btn-group-manifest" ngbDropdown role="group" [placement]="'top-start'">
          <button type="button" class="btn btn-primary btn-manifest" ngbDropdownToggle>{{ currentMasterManifest?.name }} <i appIcon="arrow-down"></i></button>
          <div class="dropdown-menu" ngbDropdownMenu>
            @for (masterManifest of filteredMasterManifests; track masterManifest) {
              <button ngbDropdownItem (click)="buttonClickSetManifest(masterManifest)" class="text-center" [class.active]="masterManifest.id === currentMasterManifest?.id" [disabled]="isDisabled">
                {{ masterManifest.name }}
              </button>
            }
          </div>
        </div>
      }
      <div class="btn-group" role="group">
        <button type="button" class="btn btn-safezone" (click)="buttonClickSafezone()" [disabled]="isDisabled">
          <i [appIcon]="safeZoneIsOn ? 'safezone-on' : 'safezone-off'"></i>
        </button>
        <button type="button" class="btn btn-detach" (click)="buttonClickToggleAttachDetach()" [disabled]="isDisabled || isToggleAttachDetachDisabled">
          <i [appIcon]="iconAttachDetach"></i>
        </button>
        <button type="button" class="btn btn-fullscreen" (click)="buttonClickFullscreen()" [disabled]="isDisabled || isFullscreenDisabled">
          <i appIcon="corners"></i>
        </button>
      </div>
    </div>
  `,
})
export class PlayerControlsComponent {
  @ViewChild('volumeControlInput')
  volumeControlInputElementRef!: ElementRef;

  @Output()
  readonly onManifestChange: EventEmitter<MasterManifest> = new EventEmitter<MasterManifest>();

  controlsState: ControlsState = {
    seekingFfPrevious: false,
    seekingPrevious: false,
    seekingFfNext: false,
    seekingNext: false,
  };

  playbackRateList = OmakasePlayerUtil.getPlayerPlaybackRateList();

  playerControlsFormGroup: FormGroup<PlayerControlsFormGroup> = new FormGroup<PlayerControlsFormGroup>({
    volume: new FormControl<number>(100, {nonNullable: true}),
  });

  safeZoneIsOn = false;

  private _masterManifests?: MasterManifest[];
  private _currentMasterManifest?: MasterManifest;
  private _filteredMasterManifests?: MasterManifest[];

  private _videoApiBreaker$ = new Subject<void>();
  private _destroyed$ = new Subject<void>();

  constructor(
    protected renderer: Renderer2,
    protected ompApiService: OmpApiService
  ) {
    this.ompApiService.onCreate$
      .pipe(
        filter((p) => !!p),
        takeUntil(this._destroyed$)
      )
      .subscribe({
        next: (api) => {
          completeSub(this._videoApiBreaker$);
          this._videoApiBreaker$ = new Subject();
          this.ompApiService
            .api!.video.onVideoLoaded$.pipe(
              takeUntil(this._videoApiBreaker$),
              filter((p) => !!p)
            )
            .subscribe({
              next: (event) => {
                this.updateVolumeProgress(this.ompApiService.api!.video.getVolume());
                if (this.ompApiService.api!.video.isMuted()) {
                  this.playerControlsFormGroup.disable({emitEvent: false});
                } else {
                  this.playerControlsFormGroup.enable({emitEvent: false});
                }
              },
            });

          this.ompApiService.api!.video.onVolumeChange$.pipe(takeUntil(this._videoApiBreaker$)).subscribe({
            next: (event) => {
              this.updateVolumeProgress(event.volume);
              if (this.ompApiService.api!.video.isMuted()) {
                this.playerControlsFormGroup.disable({emitEvent: false});
              } else {
                this.playerControlsFormGroup.enable({emitEvent: false});
              }
            },
          });
        },
      });

    this.playerControlsFormGroup.controls.volume.valueChanges.pipe(takeUntil(this._destroyed$)).subscribe({
      next: (value) => {
        if (this.ompApiService.api) {
          if (this.ompApiService.api!.video.isMuted()) {
            this.ompApiService.api!.video.unmute();
          }
          this.ompApiService.api!.video.setVolume(value / 100);
        }
      },
    });
  }

  @HostBinding('id')
  get hostElementId(): string | undefined {
    return 'player-controls';
  }

  @HostBinding('class')
  get hostElementClass(): string | undefined {
    return 'row g-0';
  }

  @Input()
  set masterManifests(value: MasterManifest[] | undefined) {
    this._masterManifests = value;
    this._filteredMasterManifests = this._masterManifests?.filter((p) => p.id !== this._currentMasterManifest?.id);
  }

  @Input()
  set currentMasterManifest(value: MasterManifest | undefined) {
    this._currentMasterManifest = value;
    this._filteredMasterManifests = this._masterManifests?.filter((p) => p.id !== this._currentMasterManifest?.id);
  }

  get currentMasterManifest(): MasterManifest | undefined {
    return this._currentMasterManifest;
  }

  get filteredMasterManifests(): MasterManifest[] | undefined {
    return this._filteredMasterManifests;
  }

  updateVolumeProgress(volume: number) {
    this.renderer.setStyle(this.volumeControlInputElementRef.nativeElement, '--volume-control-progress-percent', `${volume * 100}%`, RendererStyleFlags2.DashCase);
  }

  buttonClickTogglePlayPause() {
    this.ompApiService.api?.video.togglePlayPause();
  }

  buttonClickFullscreen() {
    this.ompApiService.api?.video.toggleFullscreen();
  }

  buttonClickSafezone() {
    this.safeZoneIsOn = !this.safeZoneIsOn;
    if (this.safeZoneIsOn) {
      this.ompApiService.api!.video.addSafeZone({
        topRightBottomLeftPercent: [10, 10, 10, 10],
      });
      this.ompApiService.api!.video.addSafeZone({
        topRightBottomLeftPercent: [5, 5, 5, 5],
      });
    } else {
      this.ompApiService.api!.video.clearSafeZones();
    }
  }

  buttonClickFfPreviousFrame() {
    let seek = () => {
      this.controlsState.seekingFfPrevious = true;
      this.ompApiService.api?.video
        .seekFromCurrentFrame(-10)
        .subscribe()
        .add(() => {
          if (this.isVideoPlaying) {
            this.ompApiService.api?.video.pause();
          }
          this.controlsState.seekingFfPrevious = false;
        });
    };

    this.frameSeekCheckVideoPlaying(seek);
  }

  buttonClickPreviousFrame() {
    let seek = () => {
      this.controlsState.seekingPrevious = true;
      this.ompApiService.api?.video
        .seekPreviousFrame()
        .subscribe()
        .add(() => {
          this.controlsState.seekingPrevious = false;
        });
    };

    this.frameSeekCheckVideoPlaying(seek);
  }

  buttonClickNextFrame() {
    let seek = () => {
      this.controlsState.seekingNext = true;
      this.ompApiService.api?.video
        .seekNextFrame()
        .subscribe()
        .add(() => {
          this.controlsState.seekingNext = false;
        });
    };

    this.frameSeekCheckVideoPlaying(seek);
  }

  buttonClickFfNextFrame() {
    let seek = () => {
      this.controlsState.seekingFfNext = true;
      this.ompApiService.api?.video
        .seekFromCurrentFrame(100)
        .subscribe()
        .add(() => {
          this.controlsState.seekingFfNext = false;
        });
    };

    this.frameSeekCheckVideoPlaying(seek);
  }

  buttonClickToggleAttachDetach() {
    if (this.ompApiService.api!.video.getVideoWindowPlaybackState() === 'attached') {
      this.ompApiService.api!.video.detachVideoWindow();
    } else if (this.ompApiService.api!.video.getVideoWindowPlaybackState() === 'detached') {
      this.ompApiService.api!.video.attachVideoWindow();
    }
  }

  private frameSeekCheckVideoPlaying(seek: () => void) {
    if (this.isVideoPlaying) {
      this.ompApiService.api?.video.pause().subscribe({
        next: () => {
          seek();
        },
      });
    } else {
      seek();
    }
  }

  buttonClickSetPlaybackRate(value: number) {
    this.ompApiService.api?.video.setPlaybackRate(value);
  }

  buttonClickSetManifest(masterManifest: MasterManifest) {
    if (masterManifest.id !== this._currentMasterManifest?.id) {
      this.onManifestChange.next(masterManifest);
    }
  }

  buttonVolumeClick() {
    this.ompApiService.api?.video.toggleMuteUnmute();
  }

  get iconAttachDetach(): IconName {
    return this.ompApiService.api
      ? this.ompApiService.api.video.getVideoWindowPlaybackState() === 'attached' || this.ompApiService.api.video.getVideoWindowPlaybackState() === 'detaching'
        ? 'detach'
        : 'attach'
      : 'detach';
  }

  get playbackRate(): number {
    return this.ompApiService.api?.video.getPlaybackRate() ? this.ompApiService.api?.video.getPlaybackRate() : 1;
  }

  get isVideoPlaying(): boolean {
    return this.ompApiService.api ? this.ompApiService.api.video.isPlaying() : false;
  }

  get isDisabled(): boolean {
    return !this.ompApiService.api || (this.ompApiService.api.video && !this.ompApiService.api.video.isVideoLoaded());
  }

  get isToggleAttachDetachDisabled(): boolean {
    return !!this.ompApiService.api && this.ompApiService.api.video.getVideoWindowPlaybackState() === 'detaching' && this.ompApiService.api.video.getVideoWindowPlaybackState() === 'attaching';
  }

  get isFullscreenDisabled(): boolean {
    return !!this.ompApiService.api && this.ompApiService.api.video.getVideoWindowPlaybackState() !== 'attached';
  }

  get volumeIcon(): IconName {
    if (this.ompApiService.api) {
      if (this.ompApiService.api.video.isMuted()) {
        return 'volume-muted';
      } else {
        let volume: number = this.ompApiService.api.video.getVolume();
        return volume === 0 ? 'volume-zero' : volume >= 0.5 ? 'volume' : 'volume-low';
      }
    } else {
      return 'volume-zero';
    }
  }

  get showManifests(): boolean {
    return !!this._filteredMasterManifests && this._filteredMasterManifests.length > 0;
  }
}
