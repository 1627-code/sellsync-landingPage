import {ReactNode} from "react";
import PropTypes from "prop-types";

const Alert = ({children}) => {
    return (
        <div className="alert alert-primary">{children}</div>
    )
}

Alert.propTypes = {
    children: PropTypes.ReactNode,
}

export default Alert