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
import {VideoApi} from '@byomakase/omakase-player';
import {NgbDropdownModule} from '@ng-bootstrap/ng-bootstrap';
import {JsonPipe} from '@angular/common';
import {IconModule} from '../icon/icon.module';
import {FormControl, FormGroup, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {filter, Subject, takeUntil} from 'rxjs';
import {IconName} from '../icon/icon.service';
import {completeSub} from '../../../util/rx-util';
import {MasterManifest} from '../../../model/domain.model';
import {OmakasePlayerUtil} from '../omakase-player/omakase-player-util';

interface ControlsState {
  seekingFfPrevious: boolean,
  seekingPrevious: boolean,
  seekingFfNext: boolean,
  seekingNext: boolean,
}

interface PlayerControlsFormGroup {
  volume: FormControl<number>,
}

@Component({
  selector: 'div[appPlayerControls]',
  standalone: true,
  imports: [
    NgbDropdownModule,
    JsonPipe,
    IconModule,
    FormsModule,
    ReactiveFormsModule
  ],
  template: `
    <div class="col-4 d-flex justify-content-start">
      <div class="btn-group btn-group-speed" ngbDropdown role="group" [placement]="'top-start'">
        <button type="button" class="btn btn-primary btn-speed" ngbDropdownToggle>
          Speed: {{ playbackRate }}x <i appIcon="arrow-down"></i>
        </button>
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
        <input type="range" class="form-range" #volumeControlInput
               [min]="0" [max]="100"
               [formGroup]="playerControlsFormGroup" [formControl]="playerControlsFormGroup.controls.volume"
        >
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
          <button type="button" class="btn btn-primary btn-manifest" ngbDropdownToggle>
            {{ currentMasterManifest?.name }} <i appIcon="arrow-down"></i>
          </button>
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
        <button type="button" class="btn btn-fullscreen" (click)="buttonClickFullscreen()" [disabled]="isDisabled">
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
    seekingNext: false
  }

  playbackRateList = OmakasePlayerUtil.getPlayerPlaybackRateList();

  playerControlsFormGroup: FormGroup<PlayerControlsFormGroup> = new FormGroup<PlayerControlsFormGroup>({
    volume: new FormControl<number>(100, {nonNullable: true})
  })

  private _masterManifests?: MasterManifest[];
  private _currentMasterManifest?: MasterManifest;
  private _filteredMasterManifests?: MasterManifest[];

  private _videoApi: VideoApi | undefined;

  private _videoApiBreaker$ = new Subject<void>();
  private _destroyed$ = new Subject<void>();

  constructor(protected renderer: Renderer2) {
    this.playerControlsFormGroup.controls.volume.valueChanges.pipe(takeUntil(this._destroyed$)).subscribe({
      next: (value) => {
        if (this._videoApi) {
          if (this._videoApi.isMuted()) {
            this._videoApi.unmute();
          }
          this._videoApi.setVolume(value / 100)
        }
      }
    })
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
    this._filteredMasterManifests = this._masterManifests?.filter(p => (p.id !== this._currentMasterManifest?.id));
  }

  @Input()
  set currentMasterManifest(value: MasterManifest | undefined) {
    this._currentMasterManifest = value;
    this._filteredMasterManifests = this._masterManifests?.filter(p => (p.id !== this._currentMasterManifest?.id));
  }

  get currentMasterManifest(): MasterManifest | undefined {
    return this._currentMasterManifest;
  }

  get filteredMasterManifests(): MasterManifest[] | undefined {
    return this._filteredMasterManifests;
  }

  @Input()
  set videoApi(value: VideoApi | undefined) {
    this._videoApi = value;
    if (this._videoApi) {
      completeSub(this._videoApiBreaker$);
      this._videoApiBreaker$ = new Subject();
      this._videoApi.onVideoLoaded$.pipe(takeUntil(this._videoApiBreaker$), filter(p => !!p)).subscribe({
        next: (event) => {
          this.updateVolumeProgress(this._videoApi!.getVolume());
          if (this._videoApi!.isMuted()) {
            this.playerControlsFormGroup.disable({emitEvent: false});
          } else {
            this.playerControlsFormGroup.enable({emitEvent: false});
          }
        }
      })

      this._videoApi.onVolumeChange$.pipe(takeUntil(this._videoApiBreaker$)).subscribe({
        next: (event) => {
          this.updateVolumeProgress(event.volume);
          if (this._videoApi!.isMuted()) {
            this.playerControlsFormGroup.disable({emitEvent: false});
          } else {
            this.playerControlsFormGroup.enable({emitEvent: false});
          }
        }
      })
    }
  }

  updateVolumeProgress(volume: number) {
    this.renderer.setStyle(this.volumeControlInputElementRef.nativeElement, '--volume-control-progress-percent', `${volume * 100}%`, RendererStyleFlags2.DashCase);
  }

  buttonClickTogglePlayPause() {
    this._videoApi?.togglePlayPause();
  }

  buttonClickFullscreen() {
    this._videoApi?.toggleFullscreen()
  }

  buttonClickFfPreviousFrame() {
    let seek = () => {
      this.controlsState.seekingFfPrevious = true;
      this._videoApi?.seekFromCurrentFrame(-10).subscribe().add(() => {
        if (this.isVideoPlaying) {
          this._videoApi?.pause();
        }
        this.controlsState.seekingFfPrevious = false;
      });
    }

    this.frameSeekCheckVideoPlaying(seek);
  }

  buttonClickPreviousFrame() {
    let seek = () => {
      this.controlsState.seekingPrevious = true;
      this._videoApi?.seekPreviousFrame().subscribe().add(() => {
        this.controlsState.seekingPrevious = false;
      });
    }

    this.frameSeekCheckVideoPlaying(seek);
  }

  buttonClickNextFrame() {
    let seek = () => {
      this.controlsState.seekingNext = true;
      this._videoApi?.seekNextFrame().subscribe().add(() => {
        this.controlsState.seekingNext = false;
      });
    }

    this.frameSeekCheckVideoPlaying(seek);
  }

  buttonClickFfNextFrame() {
    let seek = () => {
      this.controlsState.seekingFfNext = true;
      this._videoApi?.seekFromCurrentFrame(100).subscribe().add(() => {
        this.controlsState.seekingFfNext = false;
      });
    }

    this.frameSeekCheckVideoPlaying(seek);
  }

  private frameSeekCheckVideoPlaying(seek: () => void) {
    if (this.isVideoPlaying) {
      this._videoApi?.pause();
      setTimeout(() => {
        seek();
      }, 100)
    } else {
      seek()
    }
  }

  buttonClickSetPlaybackRate(value: number) {
    this._videoApi?.setPlaybackRate(value);
  }

  buttonClickSetManifest(masterManifest: MasterManifest) {
    if (masterManifest.id !== this._currentMasterManifest?.id) {
      this.onManifestChange.next(masterManifest);
    }
  }

  buttonVolumeClick() {
    this._videoApi?.toggleMuteUnmute();
  }

  get playbackRate(): number {
    return this._videoApi?.getPlaybackRate() ? this._videoApi?.getPlaybackRate() : 1;
  }

  get isVideoPlaying(): boolean {
    return this._videoApi ? this._videoApi.isPlaying() : false;
  }

  get isDisabled(): boolean {
    return !this._videoApi;
  }

  get volumeIcon(): IconName {
    if (this._videoApi) {
      if (this._videoApi.isMuted()) {
        return 'volume-muted'
      } else {
        let volume: number = this._videoApi.getVolume();
        return volume === 0 ? 'volume-zero' : volume >= 0.5 ? 'volume' : 'volume-low';
      }
    } else {
      return 'volume-zero'
    }
  }

  get showManifests(): boolean {
    return !!this._filteredMasterManifests && this._filteredMasterManifests.length > 0;
  }

}
