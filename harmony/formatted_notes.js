/** Notes as formatted for records

  {
    [notes]: <Notes String>
  }

  @returns
  {
    notes: <Formatted Notes String>
  }
*/
module.exports = ({notes}) => {
  if (typeof notes === 'string') {
    return {notes: notes.replace(/[\r\n]/gim, ' ') || ''};
  }

  return {notes: notes || ''};
};
