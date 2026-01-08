import React from 'react';
import { ConnectionState } from '../types';

interface Props {
    state: ConnectionState;
}

export const ConnectionStatus: React.FC<Props> = ({ state }) => {
    const getStatusInfo = () => {
        switch (state) {
            case 'connected':
                return { text: 'Connected', className: 'status-connected' };
            case 'connecting':
                return { text: 'Connecting...', className: 'status-connecting' };
            case 'reconnecting':
                return { text: 'Reconnecting...', className: 'status-reconnecting' };
            case 'disconnected':
                return { text: 'Disconnected', className: 'status-disconnected' };
        }
    };

    const { text, className } = getStatusInfo();

    return (
        <div className={`connection-status ${className}`}>
            <span className="status-dot"></span>
            <span className="status-text">{text}</span>
        </div>
    );
};
