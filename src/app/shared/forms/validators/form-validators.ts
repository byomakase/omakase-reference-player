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

import {AbstractControl, ValidationErrors, ValidatorFn, Validators} from '@angular/forms';

export class FormValidators {
  static VALID = null; // null marks validation as successful

  static alwaysValid(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      return valid();
    };
  }

  static number(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const positiveNegativeNumber = /^(?:-?\d+|-?\d{1,3}(?:,\d{3})+)?(?:\.\d+)?$/;

      if (hasValidationErrors(Validators.required(control))) {
        return valid();
      }

      const v: string = control.value;
      return positiveNegativeNumber.test(v) ? valid() : {number: true};
    };
  }
}

function valid(): null {
  return FormValidators.VALID;
}

function hasValidationErrors(obj: any): boolean {
  return obj !== undefined && obj !== null;
}
