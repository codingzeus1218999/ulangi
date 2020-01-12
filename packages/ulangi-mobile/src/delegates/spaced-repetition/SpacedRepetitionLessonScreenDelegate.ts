/*
 * Copyright (c) Minh Loi.
 *
 * This file is part of Ulangi which is released under GPL v3.0.
 * See LICENSE or go to https://www.gnu.org/licenses/gpl-3.0.txt
 */

import { VocabularyExtraFieldDetails } from '@ulangi/ulangi-common/constants';
import {
  ActivityState,
  ButtonSize,
  Feedback,
  ScreenName,
  ScreenState,
} from '@ulangi/ulangi-common/enums';
import { VocabularyExtraFields } from '@ulangi/ulangi-common/interfaces';
import {
  ObservableSetStore,
  ObservableSpacedRepetitionLessonScreen,
  Observer,
} from '@ulangi/ulangi-observable';
import { boundClass } from 'autobind-decorator';
import * as _ from 'lodash';
import { BackHandler } from 'react-native';

import { LightBoxDialogIds } from '../../constants/ids/LightBoxDialogIds';
import { ErrorConverter } from '../../converters/ErrorConverter';
import { ReviewActionButtonFactory } from '../../factories/review-action/ReviewActionButtonFactory';
import { ReviewIterator } from '../../iterators/ReviewIterator';
import { FullRoundedButtonStyle } from '../../styles/FullRoundedButtonStyle';
import { LessonScreenStyle } from '../../styles/LessonScreenStyle';
import { AdAfterLessonDelegate } from '../ad/AdAfterLessonDelegate';
import { AdDelegate } from '../ad/AdDelegate';
import { NavigatorDelegate } from '../navigator/NavigatorDelegate';
import { ReviewFeedbackBarDelegate } from '../review-feedback/ReviewFeedbackBarDelegate';
import { SpeakDelegate } from '../vocabulary/SpeakDelegate';
import { SpacedRepetitionSaveResultDelegate } from './SpacedRepetitionSaveResultDelegate';

@boundClass
export class SpacedRepetitionLessonScreenDelegate {
  private errorConverter = new ErrorConverter();
  private reviewActionButtonFactory = new ReviewActionButtonFactory();

  private observer: Observer;
  private setStore: ObservableSetStore;
  private observableScreen: ObservableSpacedRepetitionLessonScreen;
  private reviewIterator: ReviewIterator;
  private reviewFeedbackBarDelegate: ReviewFeedbackBarDelegate;
  private saveResultDelegate: SpacedRepetitionSaveResultDelegate;
  private speakDelegate: SpeakDelegate;
  private adDelegate: AdDelegate;
  private adAfterLessonDelegate: AdAfterLessonDelegate;
  private navigatorDelegate: NavigatorDelegate;
  private startLesson: () => void;

  public constructor(
    observer: Observer,
    setStore: ObservableSetStore,
    observableScreen: ObservableSpacedRepetitionLessonScreen,
    reviewIterator: ReviewIterator,
    reviewFeedbackBarDelegate: ReviewFeedbackBarDelegate,
    saveResultDelegate: SpacedRepetitionSaveResultDelegate,
    speakDelegate: SpeakDelegate,
    adDelegate: AdDelegate,
    adAfterLessonDelegate: AdAfterLessonDelegate,
    navigatorDelegate: NavigatorDelegate,
    startLesson: () => void,
  ) {
    this.observer = observer;
    this.setStore = setStore;
    this.observableScreen = observableScreen;
    this.reviewIterator = reviewIterator;
    this.reviewFeedbackBarDelegate = reviewFeedbackBarDelegate;
    this.saveResultDelegate = saveResultDelegate;
    this.speakDelegate = speakDelegate;
    this.adDelegate = adDelegate;
    this.adAfterLessonDelegate = adAfterLessonDelegate;
    this.navigatorDelegate = navigatorDelegate;
    this.startLesson = startLesson;
  }

  public disableAllButtons(): void {
    this.observableScreen.reviewActionBarState.buttons.forEach(
      (button): void => {
        button.disabled = true;
      },
    );
  }

  public setUpButtons(): void {
    const {
      vocabulary,
      currentQuestionType,
      shouldShowAnswer,
    } = this.observableScreen.reviewState;

    this.observableScreen.reviewActionBarState.buttons.replace([
      this.reviewActionButtonFactory.createPreviousButton(
        this.observableScreen.reviewState.currentIndex === 0,
        (): void => this.previousItem(),
      ),
      shouldShowAnswer === false
        ? this.reviewActionButtonFactory.createShowAnswerButton(
            (): void => {
              this.showAnswer();
              this.setUpButtons();
            },
          )
        : this.reviewActionButtonFactory.createNextButton(
            (): void => this.showReviewFeedbackBar(),
          ),
      this.reviewActionButtonFactory.createPlayAudioButton(
        shouldShowAnswer === true || currentQuestionType === 'forward'
          ? vocabulary.vocabularyTerm
          : '',
        (): void => {
          this.synthesizeAndSpeak(vocabulary.vocabularyTerm);
        },
      ),
    ]);
    _.toPairs(vocabulary.vocabularyExtraFields).forEach(
      ([key, valueList]): void => {
        if (
          VocabularyExtraFieldDetails[key as keyof VocabularyExtraFields]
            .params[0].isSpeakable === true
        ) {
          valueList.forEach(
            (values: string[]): void => {
              this.reviewActionButtonFactory.createPlayAudioButton(
                shouldShowAnswer === true || currentQuestionType === 'forward'
                  ? values[0]
                  : '',
                (): void => this.synthesizeAndSpeak(values[0]),
              );
            },
          );
        }
      },
    );
  }

  public autoUpdateButtons(): void {
    this.observer.reaction(
      (): boolean =>
        this.observableScreen.speakState.get() === ActivityState.ACTIVE,
      (isSpeaking): void => {
        this.observableScreen.reviewActionBarState.buttons.forEach(
          (button): void => {
            if (button.title === 'PLAY AUDIO') {
              button.loading = isSpeaking;
              button.disabled = isSpeaking;
            }
          },
        );
      },
    );
  }

  public setFeedback(feedback: Feedback): void {
    this.observableScreen.feedbackListState.feedbackList.set(
      this.observableScreen.reviewState.vocabulary.vocabularyId,
      feedback,
    );

    this.reviewFeedbackBarDelegate.hide(
      (): void => {
        this.nextItem();
      },
    );
  }

  public takeAnotherLesson(): void {
    this.quit();
    this.observer.when(
      (): boolean =>
        this.observableScreen.screenState === ScreenState.UNMOUNTED,
      (): void => this.startLesson(),
    );
  }

  public quit(): void {
    if (this.observableScreen.shouldShowAdOrGoogleConsentForm.get()) {
      this.adAfterLessonDelegate.showAdOrGoogleConsentForm(
        (): void => this.navigatorDelegate.pop(),
      );
    } else {
      this.navigatorDelegate.pop();
    }
  }

  public showReviewFeedback(): void {
    this.navigatorDelegate.push(ScreenName.REVIEW_FEEDBACK_SCREEN, {
      lessonType: 'spaced-repetition',
      vocabularyList: this.observableScreen.vocabularyList,
      originalFeedbackList: this.observableScreen.feedbackListState
        .feedbackList,
      onSaveSucceeded: this.updateFeedbackList,
    });
  }

  public saveResult(): void {
    this.saveResultDelegate.save(true, {
      onSaving: (): void => {
        this.observableScreen.saveState.set(ActivityState.ACTIVE);
      },
      onSaveSucceeded: (): void => {
        this.observableScreen.saveState.set(ActivityState.INACTIVE);
      },
      onSaveFailed: (): void => {
        this.observableScreen.saveState.set(ActivityState.ERROR);
      },
    });
  }

  public autoDisablePopGestureWhenAdRequiredToShow(): void {
    this.adAfterLessonDelegate.autoDisablePopGestureWhenAdRequiredToShow();
  }

  public shouldLoadAd(): boolean {
    return this.adDelegate.shouldLoadAd();
  }

  public loadAd(): void {
    this.adDelegate.loadAd();
  }

  public handleBackButton(): boolean {
    return this.adAfterLessonDelegate.handleShowAdOrGoogleConsentForm();
  }

  public addBackButtonHandler(handler: () => void): void {
    BackHandler.addEventListener('hardwareBackPress', handler);
  }

  public removeBackButtonHandler(handler: () => void): void {
    BackHandler.removeEventListener('hardwareBackPress', handler);
  }

  public showAdOrGoogleConsentForm(onClose: () => void): void {
    this.adAfterLessonDelegate.showAdOrGoogleConsentForm(onClose);
  }

  public showConfirmQuitLessonDialog(): void {
    this.navigatorDelegate.showDialog(
      {
        testID: LightBoxDialogIds.SUCCESS_DIALOG,
        message:
          'The lesson result is not yet saved. Are you sure you want to quit?',
        onBackgroundPress: (): void => {
          this.navigatorDelegate.dismissLightBox();
        },
        buttonList: [
          {
            testID: LightBoxDialogIds.CLOSE_DIALOG_BTN,
            text: 'NO',
            onPress: (): void => {
              this.navigatorDelegate.dismissLightBox();
            },
            styles: FullRoundedButtonStyle.getFullGreyBackgroundStyles(
              ButtonSize.SMALL,
            ),
          },
          {
            testID: LightBoxDialogIds.OKAY_BTN,
            text: 'YES',
            onPress: (): void => {
              this.navigatorDelegate.dismissLightBox();
              this.navigatorDelegate.pop();
            },
            styles: FullRoundedButtonStyle.getFullGreyBackgroundStyles(
              ButtonSize.SMALL,
            ),
          },
        ],
      },
      LessonScreenStyle.LIGHT_BOX_SCREEN_STYLES,
    );
  }

  public showSavingInProgressDialog(): void {
    this.navigatorDelegate.showDialog(
      {
        message:
          'Saving in progress. Please wait until save is completed then try again.',
        showCloseButton: true,
        closeOnTouchOutside: true,
      },
      LessonScreenStyle.LIGHT_BOX_SCREEN_STYLES,
    );
  }

  private previousItem(): void {
    if (this.observableScreen.reviewState.currentIndex > 0) {
      this.disableAllButtons();
      this.observableScreen.reviewState.shouldRunFadeOutAnimation = true;
      this.observer.when(
        (): boolean =>
          this.observableScreen.reviewState.shouldRunFadeOutAnimation === false,
        (): void => {
          const previousItem = this.reviewIterator.previous();
          this.observableScreen.reviewState.setUpPreviousItem(previousItem);
          this.setUpButtons();
        },
      );
    }
  }

  private nextItem(): void {
    if (this.reviewIterator.isDone()) {
      this.observableScreen.shouldShowAdOrGoogleConsentForm.set(
        this.adDelegate.shouldShowAdOrGoogleConsentForm(),
      );

      this.observableScreen.shouldShowResult.set(true);
      this.saveResult();
    } else {
      this.disableAllButtons();
      this.observableScreen.reviewState.shouldRunFadeOutAnimation = true;
      this.observer.when(
        (): boolean =>
          this.observableScreen.reviewState.shouldRunFadeOutAnimation === false,
        (): void => {
          const nextItem = this.reviewIterator.next();
          this.observableScreen.reviewState.setUpNextItem(nextItem);
          this.setUpButtons();
        },
      );
    }
  }

  private showAnswer(): void {
    this.observableScreen.reviewState.shouldShowAnswer = true;
  }

  private showReviewFeedbackBar(): void {
    this.reviewFeedbackBarDelegate.show(
      this.observableScreen.reviewState.vocabulary,
    );
  }

  private synthesizeAndSpeak(text: string): void {
    this.speakDelegate.synthesize(
      text,
      this.setStore.existingCurrentSet.learningLanguageCode,
      {
        onSynthesizing: (): void => {
          this.observableScreen.speakState.set(ActivityState.ACTIVE);
        },
        onSynthesizeSucceeded: (filePath): void => {
          this.speak(filePath);
        },
        onSynthesizeFailed: (errorCode): void => {
          this.observableScreen.speakState.set(ActivityState.INACTIVE);
          this.showSynthesizeErrorDialog(errorCode);
        },
      },
    );
  }

  private speak(filePath: string): void {
    this.speakDelegate.speak(filePath, {
      onSpeaking: (): void => {
        this.observableScreen.speakState.set(ActivityState.ACTIVE);
      },
      onSpeakSucceeded: (): void => {
        this.observableScreen.speakState.set(ActivityState.INACTIVE);
      },
      onSpeakFailed: (): void => {
        this.observableScreen.speakState.set(ActivityState.INACTIVE);
      },
    });
  }

  private showSynthesizeErrorDialog(errorCode: string): void {
    this.navigatorDelegate.showDialog(
      {
        message: this.errorConverter.convertToMessage(errorCode),
        showCloseButton: true,
        closeOnTouchOutside: true,
      },
      LessonScreenStyle.LIGHT_BOX_SCREEN_STYLES,
    );
  }

  private updateFeedbackList(
    feedbackList: ReadonlyMap<string, Feedback>,
  ): void {
    this.observableScreen.feedbackListState.feedbackList.replace(feedbackList);
  }
}
