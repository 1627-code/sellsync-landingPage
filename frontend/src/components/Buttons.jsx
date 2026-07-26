import PropTypes from "prop-types";

const Button = ({children, onClick, color}) => {
    const buttontypes = [
        "primary",
        "secondary",
        "success",
        "danger",
        "warning",
        "info",
        "light",
        "dark",
        "link"
    ]
    return (
        
        <>
                {buttontypes.map((t) => (
                    <button 
                    key={t}
                    type="button" 
                    className={'btn btn-' + color}
                    onClick={onClick}
                    >
                    {children}
                    </button>
                ))}
        </>   
        
    )
}

Buttons.propTypes = {
    children: PropTypes.string,
    color: PropTypes.string,
    onClick: PropTypes.func.isRequired,
}

export default Button