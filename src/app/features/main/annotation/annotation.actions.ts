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

import {Annotation} from './annotation.state';

export namespace AnnotationActions {
  export class SelectAnnotation {
    static readonly type = '[Annotation] Select Annotation';

    constructor(public annotationId: string | undefined) {}
  }

  export class ResetAnnotations {
    static readonly type = '[Annotation] Reset Annotations';

    constructor() {}
  }

  export class AddAnnotation {
    static readonly type = '[Annotation] Add Annotation';

    constructor(public annotation: Annotation) {}
  }

  export class DeleteAnnotation {
    static readonly type = '[Annotation] Delete Annotation';

    constructor(public annotationId: string) {}
  }

  export class UpdateAnnotation {
    static readonly type = '[Annotation] Update Annotation';

    constructor(
      public annotationId: string,
      public updateValue: Partial<Annotation>
    ) {}
  }
}
