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

import {AfterViewInit, Component, ElementRef, HostBinding, OnInit, ViewChild} from '@angular/core';
import {CoreModule} from '../../../core/core.module';
import {SharedModule} from '../../../shared/shared.module';
import {animate, AnimationEvent, state, style, transition, trigger} from '@angular/animations';
import {Select, Store} from '@ngxs/store';
import {filter, map, Observable, Subject, take} from 'rxjs';
import {VuMeterState, VuMeterStateModel} from './vu-meter.state';
import {VuMeterActions} from './vu-meter.actions';
import {WebAudioPeakMeter} from 'web-audio-peak-meter';
import {OmpApiService} from '../../../shared/components/omakase-player/omp-api.service';
import {AudioMeterStandard} from '@byomakase/omakase-player/dist/video/model';
import Minimize = VuMeterActions.Minimize;
import Maximize = VuMeterActions.Maximize;

const animateDurationMs = 300;
const animateTimings = `${animateDurationMs}ms ease-in-out`;

const vuMeterSingleBarWidth = 25;
const viMeterScaleWidth = 30;

@Component({
  selector: 'div[appVuMeter]',
  standalone: true,
  imports: [CoreModule, SharedModule],
  template: `
    <div
      class="vu-meter-frame d-flex flex-column h-100"
      [class.minimized]="(animationState | async) === 'minimized'"
      [class.maximized]="(animationState | async) === 'maximized'"
      [@toggleMinimizeMaximize]="{
        value: (animationState | async),
        params: {minimizedWidth: minimizedWidth, maximizedWidth: maximizedWidth},
      }"
      (@toggleMinimizeMaximize.start)="onAnimationEventStart($event)"
      (@toggleMinimizeMaximize.done)="onAnimationEventDone($event)"
    >
      <div class="vu-meter-header">
        <div class="d-flex h-100">
          <div class="btn-group" role="group">
            <button
              type="button"
              class="btn"
              [class.btn-maximize]="(animationState | async) === 'minimized'"
              [class.btn-minimize]="(animationState | async) === 'maximized'"
              (click)="toggleMinimizeMaximize()"
            ></button>
          </div>
        </div>
      </div>

      <div class="vu-meter-eq flex-grow-1">
        <div class="d-flex flex-column justify-content-end h-100">
          <div class="web-audio-peak-meter flex-grow-1" #webAudioPeakMeter></div>
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
      state(
        'minimized',
        style({
          width: `{{minimizedWidth}}px`,
        }),
        {params: {minimizedWidth: 0}}
      ),
      state(
        'maximized',
        style({
          width: `{{maximizedWidth}}px`,
        }),
        {params: {maximizedWidth: 0}}
      ),
      transition('* => *', [animate(animateTimings)]),
    ]),
  ],
})
export class VuMeterComponent implements OnInit, AfterViewInit {
  @ViewChild('webAudioPeakMeter') webAudioPeakMeterElementRef!: ElementRef;

  @Select(VuMeterState) state$!: Observable<VuMeterStateModel>;

  private _webAudioPeakMeter?: WebAudioPeakMeter;

  private _minimizedWidth: number = vuMeterSingleBarWidth * 2;
  private _maximizedWidth: number = this._minimizedWidth;

  private _destroyed$ = new Subject<void>();

  constructor(
    protected store: Store,
    protected ompApiService: OmpApiService
  ) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.ompApiService.onCreate$
      .pipe(
        filter((p) => !!p),
        take(1)
      )
      .subscribe({
        next: () => {
          setTimeout(() => {
            this.tryCreateWebAudioPeakMeter();
          });
        },
      });
  }

  @HostBinding('id')
  get hostElementId(): string | undefined {
    return 'vu-meter';
  }

  private tryCreateWebAudioPeakMeter() {
    let channelCount = 2;

    this.minimizedWidth = channelCount * vuMeterSingleBarWidth;
    this.maximizedWidth = this.minimizedWidth + viMeterScaleWidth + 14;

    this.ompApiService.api!.audio.createAudioRouter(channelCount).subscribe({
      next: () => {
        let peakMeterConfig = {
          maskTransition: '0.1s',
          audioMeterStandard: 'peak-sample' as AudioMeterStandard,
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
        };

        this._webAudioPeakMeter = new WebAudioPeakMeter(this.ompApiService.api!.audio.getMediaElementAudioSourceNode()!, this.webAudioPeakMeterElementRef.nativeElement, peakMeterConfig);

        this.ompApiService.api!.video.onVideoWindowPlaybackStateChange$.subscribe({
          next: (event) => {
            if (event.videoWindowPlaybackState !== 'attached') {
              this._webAudioPeakMeter!.node!.port.onmessage = (event) => {}; // stop processing metrics received from VU meter's AudioWorkletNode
            } else {
              this._webAudioPeakMeter!.node!.port.onmessage = (event) => {
                this._webAudioPeakMeter!.handleNodePortMessage(event);
              }; // resume processing metrics received from VU meter's AudioWorkletNode
            }
          },
        });

        this.ompApiService.api!.audio.createAudioPeakProcessorWorkletNode(peakMeterConfig.audioMeterStandard).subscribe({
          next: (event) => {
            this.ompApiService.api!.audio.onAudioPeakProcessorWorkletNodeMessage$.subscribe({
              next: (event) => {
                if (this.ompApiService.api!.video.getVideoWindowPlaybackState() === 'detached') {
                  // @ts-ignore
                  this._webAudioPeakMeter!.handleNodePortMessage(event);
                }
              },
            });
          },
        });
      },
    });
  }

  toggleMinimizeMaximize() {
    if (this.store.selectSnapshot(VuMeterState.visibility) === 'minimized') {
      this.maximize();
    } else {
      this.minimize();
    }
  }

  minimize() {
    this.store.dispatch(new Minimize());
  }

  maximize() {
    this.store.dispatch(new Maximize());
  }

  onAnimationEventStart(event: AnimationEvent) {}

  onAnimationEventDone(event: AnimationEvent) {}

  get animationState(): Observable<string> {
    return this.state$.pipe(
      take(1),
      map((p) => p.visibility)
    );
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
