import React from 'react';
import { DateInput, type DateInputProps } from '@astryxdesign/core/DateInput';
import { TimeInput, type TimeInputProps } from '@astryxdesign/core/TimeInput';
import { DateTimeInput, type DateTimeInputProps, type ISODateTimeString } from '@astryxdesign/core/DateTimeInput';
import type { ISODateString } from '@astryxdesign/core/Calendar';

type ISOTimeString = NonNullable<TimeInputProps['value']>;

export interface AppDateInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  size?: DateInputProps['size'];
  width?: DateInputProps['width'];
  isLabelHidden?: boolean;
  isRequired?: boolean;
  isDisabled?: boolean;
  hasClear?: boolean;
  placeholder?: string;
  min?: string;
  max?: string;
}

export const AppDateInput: React.FC<AppDateInputProps> = ({
  label,
  value,
  onChange,
  size = 'sm',
  width = '100%',
  isLabelHidden = true,
  isRequired = false,
  isDisabled = false,
  hasClear = false,
  placeholder = '选择日期',
  min,
  max,
}) => (
  <DateInput
    label={label}
    isLabelHidden={isLabelHidden}
    value={(value ? value : undefined) as ISODateString | undefined}
    onChange={next => onChange(next ?? '')}
    presentation="popover"
    format="system_date"
    weekStartsOn={1}
    size={size}
    width={width}
    isRequired={isRequired}
    isDisabled={isDisabled}
    hasClear={hasClear}
    placeholder={placeholder}
    min={(min ? min : undefined) as ISODateString | undefined}
    max={(max ? max : undefined) as ISODateString | undefined}
    controlStyle={{ minWidth: 0 }}
  />
);

export interface AppTimeInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  size?: TimeInputProps['size'];
  width?: TimeInputProps['width'];
  isLabelHidden?: boolean;
  isRequired?: boolean;
  isDisabled?: boolean;
  hasClear?: boolean;
  placeholder?: string;
}

export const AppTimeInput: React.FC<AppTimeInputProps> = ({
  label,
  value,
  onChange,
  size = 'sm',
  width = '100%',
  isLabelHidden = true,
  isRequired = false,
  isDisabled = false,
  hasClear = false,
  placeholder = '例如：09:00',
}) => (
  <TimeInput
    label={label}
    isLabelHidden={isLabelHidden}
    value={(value ? value : undefined) as ISOTimeString | undefined}
    onChange={next => onChange(next ?? '')}
    hourFormat="24h"
    presentation="text-input"
    size={size}
    width={width}
    isRequired={isRequired}
    isDisabled={isDisabled}
    hasClear={hasClear}
    placeholder={placeholder}
    controlStyle={{ minWidth: 0 }}
  />
);

export interface AppDateTimeInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  size?: DateTimeInputProps['size'];
  width?: DateTimeInputProps['width'];
  isLabelHidden?: boolean;
  isRequired?: boolean;
  isDisabled?: boolean;
  hasClear?: boolean;
}

export const AppDateTimeInput: React.FC<AppDateTimeInputProps> = ({
  label,
  value,
  onChange,
  size = 'sm',
  width = '100%',
  isLabelHidden = true,
  isRequired = false,
  isDisabled = false,
  hasClear = false,
}) => (
  <DateTimeInput
    label={label}
    isLabelHidden={isLabelHidden}
    value={(value ? value : undefined) as ISODateTimeString | undefined}
    onChange={next => onChange(next ?? '')}
    presentation="popover"
    hourFormat="24h"
    weekStartsOn={1}
    timeOptionInterval={30}
    size={size}
    width={width}
    isRequired={isRequired}
    isDisabled={isDisabled}
    hasClear={hasClear}
    placeholder="选择日期"
    timePlaceholder="选择时间"
    controlStyle={{ minWidth: 0 }}
  />
);
