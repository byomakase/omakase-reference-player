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

export namespace TimelineConfiguratorActions {

  export class Minimize {
    static readonly type = '[Timeline configurator] Minimize'
  }

  export class Maximize {
    static readonly type = '[Timeline configurator] Maximize'
  }

  export class ToggleMinimizeMaximize {
    static readonly type = '[Timeline configurator] Toggle Minimize Maximize'
  }

  export class AnimationEventTriggered {
    static readonly type = '[Timeline configurator] Animation Event Triggered'
  }
}
