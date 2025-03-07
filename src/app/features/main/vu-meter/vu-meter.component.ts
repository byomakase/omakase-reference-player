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

import {AfterViewInit, Component, ElementRef, HostBinding, Input, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {CoreModule} from '../../../core/core.module';
import {SharedModule} from '../../../shared/shared.module';
import {animate, AnimationEvent, state, style, transition, trigger} from '@angular/animations';
import {Select, Store} from '@ngxs/store';
import {filter, map, Observable, Subject, take, takeUntil} from 'rxjs';
import {VuMeterState, VuMeterStateModel} from './vu-meter.state';
import {VuMeterActions} from './vu-meter.actions';
import {OmpApiService} from '../../../shared/components/omakase-player/omp-api.service';
import {LayoutService} from '../../../core/layout/layout.service';
import {completeSub} from '../../../util/rx-util';
import {IconModule} from '../../../shared/components/icon/icon.module';
import {RouterVisualizationApi} from '@byomakase/omakase-player/dist/api/router-visualization-api';
import {AudioMediaTrack} from '../../../model/domain.model';
import {PeakMeterConfig, VuMeter, VuMeterApi} from '@byomakase/vu-meter';
import Minimize = VuMeterActions.Minimize;
import Maximize = VuMeterActions.Maximize;

const animateDurationMs = 300;
const animateTimings = `${animateDurationMs}ms ease-in-out`;

const vuMeterSingleBarWidth = 25;
const viMeterScaleWidth = 30;
let audioRouterWidth = 400;

const peakMeterConfigDark: Partial<PeakMeterConfig> = {
  vertical: true,
  maskTransition: '0.1s',
  peakHoldDuration: 0,
  dbTickSize: 10,
  borderSize: 7,
  fontSize: 12,
  dbRangeMin: -60,
  dbRangeMax: 0,

  backgroundColor: 'rgba(0,0,0,0)', // transparent
  tickColor: '#70849A',
  labelColor: '#70849A',
  gradient: ['#F3C6B3 0%', '#E2BDB2 33%', '#D5B5B2 50%', '#C2AAB1 59%', '#A499B1 78%', '#8D8BB0 93%', '#747DAF 100%'],
};

const peakMeterConfigLight: Partial<PeakMeterConfig> = {
  ...peakMeterConfigDark,
  backgroundColor: '#F4F5F5',
  tickColor: '#5D6B7E',
  labelColor: '#5D6B7E',
  gradient: ['#A2CA69 0%', '#A2CA69 33%', '#A2CA69 50%', '#A2CA69 59%', '#A2CA69 78%', '#A2CA69 93%', '#A2CA69 100%'],
};

@Component({
  selector: 'div[appVuMeter]',
  standalone: true,
  imports: [CoreModule, SharedModule, IconModule],
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
            <button type="button" class="btn btn-maximize-minimize" (click)="toggleMinimizeMaximize()">
              <i [appIcon]="(animationState | async) === 'minimized' ? 'double-chevron-left' : 'double-chevron-right'"></i>
            </button>
          </div>
        </div>
      </div>

      <div class="vu-meter-eq flex-grow-1">
        <div class="d-flex flex-row h-100">
          <div #audioRouter id="omakase-audio-router" [hidden]="(animationState | async) === 'minimized'"></div>
          <div class="d-flex flex-column flex-grow-1 justify-content-end h-100">
            <div class="web-audio-peak-meter flex-grow-1" #vuMeter></div>
            <div class="channel-labels d-flex justify-content-between">
              <div></div>
              <div>L</div>
              <div>R</div>
              <div>C</div>
              <div>LFE</div>
              <div>Ls</div>
              <div>Rs</div>
            </div>
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
export class VuMeterComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('vuMeter') vuMeterElementRef!: ElementRef;
  @ViewChild('audioRouter') audioRouterElementRef!: ElementRef;

  @Select(VuMeterState) state$!: Observable<VuMeterStateModel>;

  @Input() audioMediaTracks?: AudioMediaTrack[];

  private _audioRouter?: RouterVisualizationApi;
  private _vuMeter?: VuMeterApi;

  private _activeTrack?: AudioMediaTrack;

  private _minimizedWidth: number = vuMeterSingleBarWidth * 6;
  private _maximizedWidth: number = this._minimizedWidth;

  private _destroyed$ = new Subject<void>();

  constructor(
    protected store: Store,
    protected ompApiService: OmpApiService,
    protected layoutService: LayoutService
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
            this.layoutService.presentationMode$.pipe(takeUntil(this._destroyed$)).subscribe({
              next: (presentationMode) => {
                let peakMeterConfig = presentationMode === 'dark' ? peakMeterConfigDark : peakMeterConfigLight;
                this.initializeAudioRouter();
                this.tryCreateVuMeter(peakMeterConfig);
                this.ompApiService.api!.audio.onAudioSwitched$.pipe(takeUntil(this._destroyed$)).subscribe((event) => {
                  const audioMediaTrack = this.audioMediaTracks?.find((track) => event.activeAudioTrack.label?.startsWith(track.program_name));
                  if (audioMediaTrack && audioMediaTrack.channels && this._activeTrack !== audioMediaTrack) {
                    this._activeTrack = audioMediaTrack;
                    this._audioRouter!.updateMainTrack({
                      inputNumber: audioMediaTrack.channels.length,
                      inputLabels: audioMediaTrack.channels.map((channel) => channel.channel_order ?? ''),
                    });
                  }
                });
              },
            });
          });
        },
      });
  }

  ngOnDestroy() {
    completeSub(this._destroyed$);
  }

  @HostBinding('id')
  get hostElementId(): string | undefined {
    return 'vu-meter';
  }

  private tryCreateVuMeter(peakMeterConfig: Partial<PeakMeterConfig>) {
    let channelCount = 6;

    this.minimizedWidth = channelCount * vuMeterSingleBarWidth;
    this.maximizedWidth = this.minimizedWidth + viMeterScaleWidth + 14 + audioRouterWidth;

    if (this._vuMeter) {
      this._vuMeter.destroy();
      this._vuMeter = void 0;
    }

    this._vuMeter = new VuMeter(channelCount, this.vuMeterElementRef.nativeElement, peakMeterConfig).attachSource(this.ompApiService.api!.audio.createMainAudioPeakProcessor());
  }

  private initializeAudioRouter() {
    const outputNumber = this.ompApiService.api!.audio.getAudioContext().destination.maxChannelCount >= 6 ? 6 : 2;
    audioRouterWidth = outputNumber === 6 ? 400 : 250;
    this.audioRouterElementRef.nativeElement.style.width = `${audioRouterWidth}px`;
    this._audioRouter = this.ompApiService.api!.initializeRouterVisualization({
      size: 'large',
      outputNumber,
      routerVisualizationHTMLElementId: 'omakase-audio-router',
      mainTrack: {
        inputNumber: 2,
        maxInputNumber: 6,
        inputLabels: ['L', 'R', 'C', 'LFE', 'Ls', 'Rs'],
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
