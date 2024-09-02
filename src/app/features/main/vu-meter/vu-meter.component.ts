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

import {Component, ElementRef, HostBinding, Input, ViewChild} from '@angular/core';
import {CoreModule} from '../../../core/core.module';
import {SharedModule} from '../../../shared/shared.module';
import {animate, AnimationEvent, state, style, transition, trigger} from '@angular/animations';
import {Select, Store} from '@ngxs/store';
import {map, Observable, Subject, take, takeUntil} from 'rxjs';
import {VuMeterState, VuMeterStateModel} from './vu-meter.state';
import {VuMeterActions} from './vu-meter.actions';
import {WebAudioPeakMeter} from 'web-audio-peak-meter';
import {VideoApi} from '@byomakase/omakase-player';
import Minimize = VuMeterActions.Minimize;
import Maximize = VuMeterActions.Maximize;

const animateDurationMs = 300
const animateTimings = `${animateDurationMs}ms ease-in-out`;

const vuMeterSingleBarWidth = 25;
const viMeterScaleWidth = 30;

@Component({
  selector: 'div[appVuMeter]',
  standalone: true,
  imports: [
    CoreModule,
    SharedModule
  ],
  template: `
    <div class="vu-meter-frame d-flex flex-column h-100"
         [class.minimized]="(animationState|async) === 'minimized'"
         [class.maximized]="(animationState|async) === 'maximized'"
         [@toggleMinimizeMaximize]="{value: (animationState|async), params: {minimizedWidth: minimizedWidth, maximizedWidth: maximizedWidth}}"
         (@toggleMinimizeMaximize.start)="onAnimationEventStart($event)"
         (@toggleMinimizeMaximize.done)="onAnimationEventDone($event)"
    >
      <div class="vu-meter-header">
        <div class="d-flex h-100">
          <div class="btn-group" role="group">
            <button type="button" class="btn" [class.btn-maximize]="(animationState|async) === 'minimized'" [class.btn-minimize]="(animationState|async) === 'maximized'" (click)="toggleMinimizeMaximize()"></button>
          </div>
        </div>
      </div>

      <div class="vu-meter-eq flex-grow-1">
        <div class="d-flex flex-column justify-content-end h-100">
          <div class="web-audio-peak-meter flex-grow-1" #webAudioPeakMeter>
          </div>
          <div class="channel-labels d-flex justify-content-end">
            <div>L</div>
            <div>R</div>
          </div>
        </div>
      </div>
    </div>
  `,
  animations: [
    trigger('toggleMinimizeMaximize', [
      state('minimized', style({
        width: `{{minimizedWidth}}px`
      }), {params: {minimizedWidth: 0}}),
      state('maximized', style({
        width: `{{maximizedWidth}}px`,
      }), {params: {maximizedWidth: 0}}),
      transition('* => *', [
        animate(animateTimings),
      ])
    ]),
  ]
})
export class VuMeterComponent {
  @ViewChild('webAudioPeakMeter') webAudioPeakMeterElementRef!: ElementRef;

  @Select(VuMeterState) state$!: Observable<VuMeterStateModel>;

  private _videoApi?: VideoApi;
  private _mediaElement?: HTMLMediaElement;

  private _audioContext?: AudioContext;
  private _audioSource?: MediaElementAudioSourceNode;
  private _webAudioPeakMeter?: WebAudioPeakMeter;

  private _minimizedWidth: number = vuMeterSingleBarWidth * 2;
  private _maximizedWidth: number = this._minimizedWidth;

  private _onDestroy$ = new Subject<void>();

  constructor(protected store: Store) {

  }

  @HostBinding('id')
  get hostElementId(): string | undefined {
    return 'vu-meter';
  }

  get mediaElement(): HTMLMediaElement | undefined {
    return this._mediaElement;
  }

  @Input()
  set mediaElement(value: HTMLMediaElement | undefined) {
    this._mediaElement = value;
    this.tryCreateWebAudioPeakMeter();
  }

  get videoApi(): VideoApi | undefined {
    return this._videoApi;
  }

  private tryCreateWebAudioPeakMeter() {
    if (this._mediaElement) {

      if (this._webAudioPeakMeter) {
        console.debug('Cannot connect new WebAudioPeakMeter, WebAudioPeakMeter already connected', this._webAudioPeakMeter);
        // TODO what if video element changes ?
      } else {
        // TODO db ranges adjust

        this._audioContext = new AudioContext();
        this._audioSource = this._audioContext.createMediaElementSource(this._mediaElement);
        this._audioSource.channelCountMode = 'max';

        let channelCount = 2;
        this._audioSource.channelCount = channelCount;
        this._audioContext.destination.channelCount = this._audioContext.destination.maxChannelCount >= channelCount ? channelCount : this._audioContext.destination.maxChannelCount;

        this.minimizedWidth = channelCount * vuMeterSingleBarWidth;
        this.maximizedWidth = this.minimizedWidth + viMeterScaleWidth + 14;

        this._audioSource.connect(this._audioContext.destination);

        let peakMeterConfig = {
          maskTransition: '0.1s',
          audioMeterStandard: 'peak-sample',
          peakHoldDuration: 0,

          vertical: true,
          backgroundColor: 'rgba(0,0,0,0)', // transparent
          tickColor: '#70849A',
          labelColor: '#70849A',
          gradient: ['#F3C6B3 0%', '#E2BDB2 33%', '#D5B5B2 50%', '#C2AAB1 59%', '#A499B1 78%', '#8D8BB0 93%', '#747DAF 100%'],

          dbTickSize: 10,
          borderSize: 7,
          fontSize: 12,
          dbRangeMin: -60,
          dbRangeMax: 0,

        }

        this._webAudioPeakMeter = new WebAudioPeakMeter(this._audioSource, this.webAudioPeakMeterElementRef.nativeElement, peakMeterConfig);

        this._videoApi?.onPlay$.pipe(takeUntil(this._onDestroy$), take(1)).subscribe(() => {
          this._audioContext!.resume().then(() => {
            console.debug('AudioContext resumed');
          })
        })
      }
    } else {
      console.debug('Cannot create WebAudioPeakMeter, mediaElement is undefined');
    }
  }

  @Input()
  set videoApi(value: VideoApi | undefined) {
    this._videoApi = value;
  }

  toggleMinimizeMaximize() {
    if (this.store.selectSnapshot(VuMeterState.visibility) === 'minimized') {
      this.maximize();
    } else {
      this.minimize();
    }
  }

  minimize() {
    this.store.dispatch(new Minimize())
  }

  maximize() {
    this.store.dispatch(new Maximize())
  }

  onAnimationEventStart(event: AnimationEvent) {

  }

  onAnimationEventDone(event: AnimationEvent) {

  }

  get animationState(): Observable<string> {
    return this.state$.pipe(take(1), map(p => p.visibility));
  }


  get minimizedWidth(): number {
    return this._minimizedWidth;
  }

  set minimizedWidth(value: number) {
    this._minimizedWidth = value;
  }

  get maximizedWidth(): number {
    return this._maximizedWidth;
  }

  set maximizedWidth(value: number) {
    this._maximizedWidth = value;
  }
}
