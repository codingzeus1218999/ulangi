/*
 * Copyright (c) Minh Loi.
 *
 * This file is part of Ulangi which is released under GPL v3.0.
 * See LICENSE or go to https://www.gnu.org/licenses/gpl-3.0.txt
 */

import { assertExists } from '@ulangi/assert';
import { DeepMutable, DeepPartial } from '@ulangi/extended-types';
import { SQLiteDatabase, Transaction } from '@ulangi/sqlite-adapter';
import { Action, ActionType, createAction } from '@ulangi/ulangi-action';
import { SpacedRepetitionScheduler } from '@ulangi/ulangi-common/core';
import {
  ErrorCode,
  Feedback,
  LessonType,
  ReviewPriority,
  VocabularySortType,
  VocabularyStatus,
} from '@ulangi/ulangi-common/enums';
import { Vocabulary } from '@ulangi/ulangi-common/interfaces';
import {
  LessonResultModel,
  SpacedRepetitionModel,
  VocabularyModel,
} from '@ulangi/ulangi-local-database';
import * as _ from 'lodash';
import * as moment from 'moment';
import { Task } from 'redux-saga';
import { call, cancel, fork, put, take } from 'redux-saga/effects';
import { PromiseType } from 'utility-types';
import * as uuid from 'uuid';

import { errorConverter } from '../converters/ErrorConverter';
import { SagaConfig } from '../interfaces/SagaConfig';
import { SagaEnv } from '../interfaces/SagaEnv';
import { ProtectedSaga } from './ProtectedSaga';

export class SpacedRepetitionSaga extends ProtectedSaga {
  private fetchDueAndNewCountsTask?: Task;

  private spacedRepetitionScheduler = new SpacedRepetitionScheduler();

  private userDb: SQLiteDatabase;
  private vocabularyModel: VocabularyModel;
  private spacedRepetitionModel: SpacedRepetitionModel;
  private lessonResultModel: LessonResultModel;

  public constructor(
    userDb: SQLiteDatabase,
    vocabularyModel: VocabularyModel,
    spacedRepetitionModel: SpacedRepetitionModel,
    lessonResultModel: LessonResultModel
  ) {
    super();
    this.userDb = userDb;
    this.vocabularyModel = vocabularyModel;
    this.spacedRepetitionModel = spacedRepetitionModel;
    this.lessonResultModel = lessonResultModel;
  }

  public *run(_: SagaEnv, config: SagaConfig): IterableIterator<any> {
    yield fork(
      [this, this.allowFetchVocabulary],
      config.spacedRepetition.minPerLesson,
      config.spacedRepetition.maxLevel
    );
    yield fork(
      [this, this.allowFetchAndClearDueAndNewCounts],
      config.spacedRepetition.maxLevel
    );
    yield fork([this, this.allowSaveResult], config.spacedRepetition.maxLevel);
  }

  public *allowFetchVocabulary(
    minPerLesson: number,
    maxLevel: number
  ): IterableIterator<any> {
    while (true) {
      const action: Action<
        ActionType.SPACED_REPETITION__FETCH_VOCABULARY
      > = yield take(ActionType.SPACED_REPETITION__FETCH_VOCABULARY);
      const {
        setId,
        initialInterval,
        limit,
        reviewPriority,
        selectedCategoryNames,
      } = action.payload;

      try {
        yield put(
          createAction(ActionType.SPACED_REPETITION__FETCHING_VOCABULARY, {
            setId,
          })
        );

        const {
          vocabularyList: dueVocabularyList,
        }: PromiseType<
          ReturnType<SpacedRepetitionModel['getDueVocabularyList']>
        > = yield call(
          [this.spacedRepetitionModel, 'getDueVocabularyList'],
          this.userDb,
          setId,
          initialInterval,
          maxLevel,
          selectedCategoryNames,
          VocabularySortType.RANDOM,
          limit,
          0,
          true
        );

        const {
          vocabularyList: newVocabularyList,
        }: PromiseType<
          ReturnType<SpacedRepetitionModel['getNewVocabularyList']>
        > = yield call(
          [this.spacedRepetitionModel, 'getNewVocabularyList'],
          this.userDb,
          setId,
          selectedCategoryNames,
          VocabularySortType.RANDOM,
          limit,
          0,
          true
        );

        const vocabularyList =
          reviewPriority === ReviewPriority.DUE_TERMS_FIRST
            ? [...dueVocabularyList, ...newVocabularyList].slice(0, limit)
            : reviewPriority === ReviewPriority.NEW_TERMS_FIRST
            ? [...newVocabularyList, ...dueVocabularyList].slice(0, limit)
            : _.shuffle([...newVocabularyList, ...dueVocabularyList]).slice(
                0,
                limit
              );

        if (vocabularyList.length < minPerLesson) {
          throw new Error(ErrorCode.SPACED_REPETITION__INSUFFICIENT_VOCABULARY);
        } else {
          yield put(
            createAction(
              ActionType.SPACED_REPETITION__FETCH_VOCABULARY_SUCCEEDED,
              {
                setId,
                vocabularyList,
              }
            )
          );
        }
      } catch (error) {
        yield put(
          createAction(ActionType.SPACED_REPETITION__FETCH_VOCABULARY_FAILED, {
            setId,
            errorCode: errorConverter.getErrorCode(error),
            error,
          })
        );
      }
    }
  }

  public *allowFetchAndClearDueAndNewCounts(
    maxLevel: number
  ): IterableIterator<any> {
    this.fetchDueAndNewCountsTask = yield fork(
      [this, this.allowFetchDueAndNewCounts],
      maxLevel
    );
    yield fork([this, this.allowClearDueAndNewCounts], maxLevel);
  }

  private *allowClearDueAndNewCounts(maxLevel: number): IterableIterator<any> {
    while (true) {
      yield take(ActionType.SPACED_REPETITION__CLEAR_DUE_AND_NEW_COUNTS);
      if (typeof this.fetchDueAndNewCountsTask !== 'undefined') {
        yield cancel(this.fetchDueAndNewCountsTask);
      }

      this.fetchDueAndNewCountsTask = yield fork(
        [this, this.allowFetchDueAndNewCounts],
        maxLevel
      );
    }
  }

  public *allowFetchDueAndNewCounts(maxLevel: number): IterableIterator<any> {
    while (true) {
      const action: Action<
        ActionType.SPACED_REPETITION__FETCH_DUE_AND_NEW_COUNTS
      > = yield take(ActionType.SPACED_REPETITION__FETCH_DUE_AND_NEW_COUNTS);

      const { setId, initialInterval, categoryNames } = action.payload;

      try {
        yield put(
          createAction(
            ActionType.SPACED_REPETITION__FETCHING_DUE_AND_NEW_COUNTS,
            null
          )
        );

        const newCount: PromiseType<
          ReturnType<SpacedRepetitionModel['getNewCount']>
        > = yield call(
          [this.spacedRepetitionModel, 'getNewCount'],
          this.userDb,
          setId,
          categoryNames
        );

        const dueCount: PromiseType<
          ReturnType<SpacedRepetitionModel['getDueCount']>
        > = yield call(
          [this.spacedRepetitionModel, 'getDueCount'],
          this.userDb,
          setId,
          initialInterval,
          maxLevel,
          categoryNames
        );

        yield put(
          createAction(
            ActionType.SPACED_REPETITION__FETCH_DUE_AND_NEW_COUNTS_SUCCEEDED,
            {
              dueCount,
              newCount,
            }
          )
        );
      } catch (error) {
        yield put(
          createAction(
            ActionType.SPACED_REPETITION__FETCH_DUE_AND_NEW_COUNTS_FAILED,
            {
              errorCode: errorConverter.getErrorCode(error),
              error,
            }
          )
        );
      }
    }
  }

  public *allowSaveResult(maxLevel: number): IterableIterator<any> {
    while (true) {
      const action: Action<
        ActionType.SPACED_REPETITION__SAVE_RESULT
      > = yield take(ActionType.SPACED_REPETITION__SAVE_RESULT);
      const {
        setId,
        vocabularyList,
        feedbackList,
        autoArchiveSettings,
        recordLessonResult,
      } = action.payload;

      try {
        yield put(
          createAction(ActionType.SPACED_REPETITION__SAVING_RESULT, null)
        );

        const editedVocabularyList = Array.from(feedbackList.entries()).map(
          ([vocabularyId, feedback]): DeepPartial<Vocabulary> => {
            const vocabulary = assertExists(vocabularyList.get(vocabularyId));

            const editedVocabulary: DeepMutable<DeepPartial<Vocabulary>> = {
              vocabularyId: vocabulary.vocabularyId,
              lastLearnedAt: moment().toDate(),
              level: this.spacedRepetitionScheduler.getNextLevel(
                vocabulary,
                feedback,
                maxLevel
              ),
            };

            if (
              this.spacedRepetitionScheduler.willBeArchived(
                vocabulary,
                feedback,
                maxLevel,
                autoArchiveSettings
              )
            ) {
              editedVocabulary.vocabularyStatus = VocabularyStatus.ARCHIVED;
            }

            return editedVocabulary;
          }
        );

        yield call(
          [this.userDb, 'transaction'],
          (tx: Transaction): void => {
            this.vocabularyModel.updateMultipleVocabulary(
              tx,
              editedVocabularyList.map(
                (vocabulary): [DeepPartial<Vocabulary>, undefined] => [
                  vocabulary,
                  undefined,
                ]
              ),
              'local'
            );
          }
        );

        if (recordLessonResult === true) {
          yield call(
            [this.userDb, 'transaction'],
            (tx: Transaction): void => {
              this.lessonResultModel.insertLessonResult(tx, {
                lessonResultId: uuid.v4(),
                lessonType: LessonType.SPACED_REPETITION,
                setId,
                poorCount: Array.from(feedbackList.values()).filter(
                  (feedback): boolean => feedback === Feedback.POOR
                ).length,
                fairCount: Array.from(feedbackList.values()).filter(
                  (feedback): boolean => feedback === Feedback.FAIR
                ).length,
                goodCount: Array.from(feedbackList.values()).filter(
                  (feedback): boolean => feedback === Feedback.GOOD
                ).length,
                greatCount: Array.from(feedbackList.values()).filter(
                  (feedback): boolean => feedback === Feedback.GREAT
                ).length,
                superbCount: Array.from(feedbackList.values()).filter(
                  (feedback): boolean => feedback === Feedback.SUPERB
                ).length,
                totalCount: feedbackList.size,
                createdAt: moment().toDate(),
              });
            }
          );
        }

        yield put(
          createAction(
            ActionType.SPACED_REPETITION__SAVE_RESULT_SUCCEEDED,
            null
          )
        );
      } catch (error) {
        yield put(
          createAction(ActionType.SPACED_REPETITION__SAVE_RESULT_FAILED, {
            errorCode: errorConverter.getErrorCode(error),
            error,
          })
        );
      }
    }
  }
}
