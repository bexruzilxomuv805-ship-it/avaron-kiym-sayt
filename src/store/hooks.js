import { useDispatch, useSelector } from "react-redux";

export const useReduxState = (selector) => useSelector(selector);
export const useReduxDispatch = () => useDispatch();
