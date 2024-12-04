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

import {FormControl, FormGroup} from '@angular/forms';
import {isNullOrUndefined} from '../../util/object-util';
import {StringUtil} from '../../util/string-util';

export class FormUtil {
  public static isFormControlNonEmptyAndValid(formControl: FormControl<string | null>): boolean {
    return !isNullOrUndefined(formControl) && formControl.valid && !StringUtil.isNullUndefinedOrWhitespace(formControl.value);
  }

  public static isAnyFormControlNonEmptyAndValid(...formControls: FormControl<string | null>[]): boolean {
    for (let i = 0; i < formControls.length; i++) {
      let formControl = formControls[i];
      if (FormUtil.isFormControlNonEmptyAndValid(formControl)) {
        return true;
      }
    }
    return false;
  }

  public static isAnyFormControlSetAndValid(...formControls: FormControl[]): boolean {
    for (let i = 0; i < formControls.length; i++) {
      let formControl = formControls[i];
      if (!isNullOrUndefined(formControl.value) && formControl.valid) {
        return true;
      }
    }
    return false;
  }

  public static reduceToValueObject(formGroup: FormGroup) {
    return Object.entries(formGroup.value)
      .filter(([key, value]) => !!value)
      .reduce((obj, [key, value]) => {
        return {
          ...obj,
          [key]: value,
        };
      }, {});
  }

  public static isFormControlError(formControl: FormControl, errorName: string): boolean {
    return formControl && !!formControl.errors && formControl.errors[errorName] === true;
  }
}
