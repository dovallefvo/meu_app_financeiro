export default class BaseModel {
    toJSON() { return { ...this }; }
}