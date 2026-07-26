import { useState } from "react";
import PropTypes from "prop-types";

function ListGroup({ items, headings, onSelectItem }) {
  const [selectedIndex, setSelectedIndex] = useState(-1);

  return (
    <>
      <h1>{headings}</h1>

      {items.length === 0 && <p>No item found</p>}

      <ul className="list-group">
        {items.map((item, index) => (
          <li
            className={
              selectedIndex === index
                ? "list-group-item active"
                : "list-group-item"
            }
            key={item}
            onClick={() => {
              setSelectedIndex(index);
              onSelectItem(item);
            }}
          >
            {item}
          </li>
        ))}
      </ul>
    </>
  );
}

// ✅ propTypes must come *after* the function
ListGroup.propTypes = {
  items: PropTypes.arrayOf(PropTypes.string).isRequired,
  headings: PropTypes.string.isRequired,
  onSelectItem: PropTypes.func.isRequired,
};

export default ListGroup;
