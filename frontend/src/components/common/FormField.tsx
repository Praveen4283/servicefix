import React from 'react';
import { 
  TextField, 
  TextFieldProps, 
  FormControl, 
  FormHelperText, 
  InputLabel, 
  Select, 
  MenuItem, 
  SelectProps,
  FormControlLabel,
  Checkbox,
  CheckboxProps,
  RadioGroup,
  Radio,
  RadioGroupProps,
  FormLabel
} from '@mui/material';
import { FormikErrors, FormikTouched } from 'formik';

// Base props for all field types
interface BaseFieldProps {
  name: string;
  label: string;
  touched?: FormikTouched<any>;
  errors?: FormikErrors<any>;
  required?: boolean;
}

// Text field props
interface TextFieldComponentProps extends BaseFieldProps {
  type?: TextFieldProps['type'];
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  InputProps?: TextFieldProps['InputProps'];
  InputLabelProps?: TextFieldProps['InputLabelProps'];
  fullWidth?: boolean;
  disabled?: boolean;
  onChange?: TextFieldProps['onChange'];
  onBlur?: TextFieldProps['onBlur'];
  value?: string | number;
  variant?: TextFieldProps['variant'];
  size?: TextFieldProps['size'];
  margin?: TextFieldProps['margin'];
  autoFocus?: boolean;
  autoComplete?: string;
  sx?: TextFieldProps['sx'];
}

// Select field props
interface SelectFieldProps extends BaseFieldProps {
  options: { value: string | number; label: string }[];
  onChange?: SelectProps['onChange'];
  onBlur?: SelectProps['onBlur'];
  value?: string | number;
  disabled?: boolean;
  fullWidth?: boolean;
  variant?: SelectProps['variant'];
  size?: SelectProps['size'];
  margin?: SelectProps['margin'];
}

// Checkbox field props
interface CheckboxFieldProps extends BaseFieldProps {
  onChange?: CheckboxProps['onChange'];
  onBlur?: CheckboxProps['onBlur'];
  checked?: boolean;
  disabled?: boolean;
  color?: CheckboxProps['color'];
  size?: CheckboxProps['size'];
}

// Radio group props
interface RadioFieldProps extends BaseFieldProps {
  options: { value: string | number; label: string }[];
  onChange?: RadioGroupProps['onChange'];
  onBlur?: RadioGroupProps['onBlur'];
  value?: string | number;
  row?: boolean;
  disabled?: boolean;
}

// Helper function to get error message
const getErrorMessage = (
  name: string, 
  touched?: FormikTouched<any>, 
  errors?: FormikErrors<any>
): string => {
  if (!touched || !errors || !touched[name] || !errors[name]) {
    return '';
  }
  return errors[name] as string;
};

// Text field component
export const FormTextField: React.FC<TextFieldComponentProps> = ({
  name,
  label,
  touched,
  errors,
  required = false,
  ...props
}) => {
  const hasError = touched && touched[name] && Boolean(errors && errors[name]);
  const errorMessage = getErrorMessage(name, touched, errors);

  return (
    <TextField
      id={name}
      name={name}
      label={label}
      error={hasError}
      helperText={errorMessage}
      required={required}
      {...props}
    />
  );
};

// Select field component
export const FormSelectField: React.FC<SelectFieldProps> = ({
  name,
  label,
  options,
  touched,
  errors,
  required = false,
  fullWidth = true,
  variant = 'outlined',
  ...props
}) => {
  const hasError = touched && touched[name] && Boolean(errors && errors[name]);
  const errorMessage = getErrorMessage(name, touched, errors);

  return (
    <FormControl 
      error={hasError} 
      fullWidth={fullWidth} 
      variant={variant} 
      required={required}
      margin={props.margin}
    >
      <InputLabel id={`${name}-label`}>{label}</InputLabel>
      <Select
        labelId={`${name}-label`}
        id={name}
        name={name}
        label={label}
        {...props}
      >
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
      {hasError && <FormHelperText>{errorMessage}</FormHelperText>}
    </FormControl>
  );
};

// Checkbox field component
export const FormCheckboxField: React.FC<CheckboxFieldProps> = ({
  name,
  label,
  touched,
  errors,
  required = false,
  ...props
}) => {
  const hasError = touched && touched[name] && Boolean(errors && errors[name]);
  const errorMessage = getErrorMessage(name, touched, errors);

  return (
    <FormControl error={hasError} required={required}>
      <FormControlLabel
        control={
          <Checkbox
            id={name}
            name={name}
            {...props}
          />
        }
        label={label}
      />
      {hasError && <FormHelperText>{errorMessage}</FormHelperText>}
    </FormControl>
  );
};

// Radio group component
export const FormRadioGroup: React.FC<RadioFieldProps> = ({
  name,
  label,
  options,
  touched,
  errors,
  required = false,
  row = false,
  ...props
}) => {
  const hasError = touched && touched[name] && Boolean(errors && errors[name]);
  const errorMessage = getErrorMessage(name, touched, errors);

  return (
    <FormControl error={hasError} required={required}>
      <FormLabel id={`${name}-label`}>{label}</FormLabel>
      <RadioGroup
        aria-labelledby={`${name}-label`}
        name={name}
        row={row}
        {...props}
      >
        {options.map((option) => (
          <FormControlLabel
            key={option.value}
            value={option.value}
            control={<Radio />}
            label={option.label}
            disabled={props.disabled}
          />
        ))}
      </RadioGroup>
      {hasError && <FormHelperText>{errorMessage}</FormHelperText>}
    </FormControl>
  );
};

const FormComponents = {
  FormTextField,
  FormSelectField,
  FormCheckboxField,
  FormRadioGroup
};

export default FormComponents; 