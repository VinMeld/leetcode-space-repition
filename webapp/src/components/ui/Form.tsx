import React from 'react';
import './Form.css';

// Input
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, id, ...props }) => {
    return (
        <div className="form-field">
            {label && <label htmlFor={id} className="form-label">{label}</label>}
            <input
                id={id}
                className={`form-input ${error ? 'form-input-error' : ''}`}
                {...props}
            />
            {error && <span className="form-error">{error}</span>}
        </div>
    );
};

// Textarea
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
}

export const Textarea: React.FC<TextareaProps> = ({ label, error, id, ...props }) => {
    return (
        <div className="form-field">
            {label && <label htmlFor={id} className="form-label">{label}</label>}
            <textarea
                id={id}
                className={`form-textarea ${error ? 'form-input-error' : ''}`}
                {...props}
            />
            {error && <span className="form-error">{error}</span>}
        </div>
    );
};

// Select
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({ label, error, id, options, ...props }) => {
    return (
        <div className="form-field">
            {label && <label htmlFor={id} className="form-label">{label}</label>}
            <select
                id={id}
                className={`form-select ${error ? 'form-input-error' : ''}`}
                {...props}
            >
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
            {error && <span className="form-error">{error}</span>}
        </div>
    );
};
