/*
 * Copyright (c) Minh Loi.
 *
 * This file is part of Ulangi which is released under GPL v3.0.
 * See LICENSE or go to https://www.gnu.org/licenses/gpl-3.0.txt
 */

import { IObservableArray, observable } from 'mobx';

import { ObservableReviewActionButton } from './ObservableReviewActionButton';

export class ObservableReviewActionBarState {
  @observable
  public buttons: IObservableArray<ObservableReviewActionButton>;

  public constructor(buttons: IObservableArray<ObservableReviewActionButton>) {
    this.buttons = buttons;
  }
}
