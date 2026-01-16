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

import {APP_INITIALIZER, ApplicationConfig, ErrorHandler, importProvidersFrom} from '@angular/core';
import {provideRouter} from '@angular/router';
import {routes} from './app.routes';
import {AppEffectsService} from './app-effects.service';
import {LocalStorageService} from './shared/storage/local-storage.service';
import {windowProvider, WindowToken} from './core/browser/window.provider';
import {NgxsModule, Store} from '@ngxs/store';
import {AppState} from './shared/state/app.state';
import {NgxsReduxDevtoolsPluginModule} from '@ngxs/devtools-plugin';
import {TimelineConfiguratorState} from './features/main/timeline-configurator/timeline-configurator.state';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {CustomErrorHandler} from './shared/handlers/custom-error-handler';
import {VuMeterState} from './features/main/vu-meter/vu-meter.state';
import {TelemetryState} from './features/main/telemetry/telemetry.state';
import {ChartLegendState} from './features/main/chart-legend/chart-legend.state';
import {SegmentationState} from './features/main/segmentation/segmentation.state';
import {AnnotationState} from './features/main/annotation/annotation.state';
import {provideHttpClient} from '@angular/common/http';

function initializeApp(): Promise<void> {
  return Promise.resolve();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    {
      provide: APP_INITIALIZER,
      useFactory: () => initializeApp,
      deps: [AppEffectsService, LocalStorageService],
      multi: true,
    },
    {
      provide: WindowToken,
      useFactory: windowProvider,
    },
    importProvidersFrom([
      NgxsModule.forRoot([AppState, TimelineConfiguratorState, VuMeterState, TelemetryState, ChartLegendState, SegmentationState, AnnotationState], {developmentMode: true}),
      NgxsReduxDevtoolsPluginModule.forRoot(),
      BrowserAnimationsModule,
    ]),
    {
      provide: ErrorHandler,
      useClass: CustomErrorHandler,
      deps: [Store],
    },
  ],
};
