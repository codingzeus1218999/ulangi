/*
 * Copyright (c) Minh Loi.
 *
 * This file is part of Ulangi which is released under GPL v3.0.
 * See LICENSE or go to https://www.gnu.org/licenses/gpl-3.0.txt
 */

import { assertExists } from '@ulangi/assert';
import { ActionType, createAction } from '@ulangi/ulangi-action';
import { SetBuilder } from '@ulangi/ulangi-common/builders';
import { Set } from '@ulangi/ulangi-common/interfaces';
import { EventBus, group, on, once } from '@ulangi/ulangi-event';
import { ObservableSetFormState } from '@ulangi/ulangi-observable';

export class AddSetDelegate {
  private setBuilder = new SetBuilder();

  private eventBus: EventBus;
  private setFormState: ObservableSetFormState;

  public constructor(eventBus: EventBus, setFormState: ObservableSetFormState) {
    this.eventBus = eventBus;
    this.setFormState = setFormState;
  }

  public saveAdd(callback: {
    onSaving: () => void;
    onSaveSucceeded: (set: Set) => void;
    onSaveFailed: (errorCode: string) => void;
  }): void {
    const learningLanguageCode = assertExists(
      this.setFormState.learningLanguageCode,
      'Cannot save add because learningLanguageCode is null'
    );
    const translatedToLanguageCode = assertExists(
      this.setFormState.translatedToLanguageCode,
      'Cannot save add because translatedToLanguageCode is null'
    );

    const setName =
      this.setFormState.setName === ''
        ? this.setFormState.autoGeneratedSetName
        : this.setFormState.setName;

    const set = this.setBuilder.build({
      setId: this.setFormState.setId,
      setName,
      learningLanguageCode,
      translatedToLanguageCode,
    });

    this.eventBus.pubsub(
      createAction(ActionType.SET__ADD, { set }),
      group(
        on(ActionType.SET__ADDING, callback.onSaving),
        once(
          ActionType.SET__ADD_SUCCEEDED,
          ({ set }): void => callback.onSaveSucceeded(set)
        ),
        once(
          ActionType.SET__ADD_FAILED,
          ({ errorCode }): void => callback.onSaveFailed(errorCode)
        )
      )
    );
  }
}
