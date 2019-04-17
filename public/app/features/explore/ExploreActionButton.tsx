import React, { FunctionComponent } from 'react';
import { ButtonSelect, SelectOptionItem } from '@grafana/ui';

enum ActionButtonType {
  RunQuery = 'RunQuery',
  LiveStream = 'LiveStream',
}

interface Props {
  buttonValue: ActionButtonType;
  buttonOptions: SelectOptionItem[];
  loading: boolean;
  streaming: boolean;
  onActionButtonTypeChange: (item: SelectOptionItem) => void;
  onActionButtonClick: (item: SelectOptionItem) => void;
}

export const ExploreActionButton: FunctionComponent<Props> = props => {
  const { buttonOptions, buttonValue, loading, streaming, onActionButtonTypeChange, onActionButtonClick } = props;
  const selectedOption = buttonOptions.filter(option => option.value === buttonValue)[0];

  return (
    <div className="explore-toolbar-content-item streaming-button-select">
      <div className="explore-toolbar-content-item streaming-button-select-buttons">
        <button
          className="btn btn--radius-right-0 navbar-button navbar-button--secondary navbar-button--refresh"
          onClick={onActionButtonClick}
        >
          <i
            className={
              streaming
                ? 'fa fa-spinner fa-fw fa-spin run-icon'
                : loading
                ? 'fa fa-spinner fa-fw fa-spin run-icon'
                : 'fa fa-level-down fa-fw run-icon'
            }
          />
        </button>
        <ButtonSelect
          className="navbar-button--attached btn--radius-left-0 navbar-button--secondary"
          iconClass=""
          options={buttonOptions}
          value={selectedOption}
          label={selectedOption.label}
          onChange={onActionButtonTypeChange}
        />
      </div>
    </div>
  );
};
