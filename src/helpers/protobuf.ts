import * as fs from 'fs';
import { inject, injectable, postConstruct } from 'inversify';
import * as path from 'path';
import * as protobuf from 'protobufjs';
import { Root, Type } from 'protobufjs';
import { Symbols } from '../ioc/symbols';
import { ILogger } from './logger';

@injectable()
export class ProtoBufHelper {
  public lastError: string;

  @inject(Symbols.helpers.logger)
  private logger: ILogger;
  private protos: { [k: string]: Root } = {};

  @postConstruct()
  public init() {
    this.loadProtos();
  }

  /**
   * Verifies that payload satisfies the requirements of the message type definition
   * @param {object} payload The data to be transported via ProtoBuf
   * @param {string} namespace The proto file to load messages from
   * @param {string} messageType (optional) specific message type to lookup in the proto
   * @returns {boolean} true if message is verified, else false.
   */
  public validate(payload: object, namespace: string, messageType?: string): boolean {
    const message = this.getMessageInstance(namespace, messageType);
    const result = message.verify(payload);
    if (result === null) {
      return true;
    } else {
      this.lastError = `Protobuf verify error [${namespace} ${messageType}]: ${result}`;
      this.logger.debug(`Protobuf verify error. ${result}`, JSON.stringify({payload, namespace, messageType}));
      return false;
    }
  }

  /**
   * Encode Object to Protocol Buffer
   * @param {object} payload The data to be transported via ProtoBuf
   * @param {string} namespace The proto file to load messages from
   * @param {string} messageType (optional) specific message type to lookup in the proto
   * @returns {Buffer} a Buffer containing the ProtoBuf encoded data
   */
  public encode(payload: object, namespace: string, messageType?: string): (Uint8Array|Buffer) {
    if (!this.validate(payload, namespace, messageType)) {
      return null;
    }
    const message = this.getMessageInstance(namespace, messageType);
    return message.encode(payload).finish();
  }

  /**
   * Decodes Protocol Buffer Data to Object
   * @param {Buffer} data ProtoBuf encoded data
   * @param {string} namespace The proto file to load messages from
   * @param {string} messageType (optional) specific message type to lookup in the proto
   * @returns {any}
   */
  public decode<T = any>(data: Buffer, namespace: string, messageType?: string): T {
    const message = this.getMessageInstance(namespace, messageType);
    if (message !== null) {
      try {
        return message.decode(data) as any;
      } catch (e) {
        if (e instanceof protobuf.util.ProtocolError) {
          // e.instance holds the so far decoded message with missing required fields
          throw new Error(`ProtoBuf Protocol Error ${e.message}`);
        } else {
          // wire format is invalid
          throw new Error(`ProtoBuf Wire format invalid ${e.message}`);
        }
      }
    }
    return null;
  }

  private getMessageInstance(namespace: string, messageType?: any): Type {
    const typeToLookup = messageType ? `${messageType}` : `${namespace}`;
    if (typeof this.protos[namespace] !== 'undefined') {
      let instance: Type;
      const proto = this.protos[namespace];
      try {
        instance = proto.lookupType(typeToLookup);
      } catch (e) {
        this.logger.error(`ProtoBuf: cannot find message ${typeToLookup} in ${namespace}`);
        return null;
      }
      return instance;
    } else {
      this.logger.error(`Unable to find ProtoBuf with package ${namespace} and messageType ${messageType}`);
    }
  }

  private loadProtos() {
    const protoDir = path.join(process.cwd(), 'src', 'proto');
    const files = fs.readdirSync(protoDir);
    files.forEach((filePath: string) => {
      if (filePath.match(/\.proto$/)) {
        const namespace = path.basename(filePath, '.proto');
        let root: Root;
        try {
          root = protobuf.loadSync(path.join(protoDir, filePath));
          this.protos[namespace] = root;
        } catch (err) {
          this.logger.error(err.message);
          throw err;
        }
      }
    });
  }
}
