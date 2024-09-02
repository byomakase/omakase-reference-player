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

import {TelemetryCue} from './telemetry.state'

export namespace TelemetryActions {

    export class Minimize {
      static readonly type = '[Telemetry] Minimize'
    }

    export class Maximize {
      static readonly type = '[Telemetry] Maximize'
    }

    export class ToggleMinimizeMaximize {
      static readonly type = '[Telemetry] Toggle Minimize Maximize'
    }

    export class AnimationEventTriggered {
      static readonly type = '[Telemetry] Animation Event Triggered'
    }

    export class SetCues {
      static readonly type = '[Telemetry] Set Cues'

      constructor(public cues: TelemetryCue[]) {}
    }

    export class SelectLane {
      static readonly type = '[Telemetry] Select Lane'

      constructor(public selectedLaneId: string | undefined) {}
    }
  }
