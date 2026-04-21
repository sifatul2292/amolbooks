import { AddContactDto, FilterAndPaginationContactDto, OptionContactDto, UpdateContactDto } from '../../../dto/contact.dto';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { ContactService } from './contact.service';
export declare class ContactController {
    private contactService;
    private logger;
    constructor(contactService: ContactService);
    addContact(addContactDto: AddContactDto): Promise<ResponsePayload>;
    insertManyContact(body: {
        data: AddContactDto[];
        option: OptionContactDto;
    }): Promise<ResponsePayload>;
    getAllContacts(filterContactDto: FilterAndPaginationContactDto, searchString: string): Promise<ResponsePayload>;
    getAllContactsBasic(): Promise<ResponsePayload>;
    getContactById(id: string, select: string): Promise<ResponsePayload>;
    updateContactById(id: string, updateContactDto: UpdateContactDto): Promise<ResponsePayload>;
    updateMultipleContactById(updateContactDto: UpdateContactDto): Promise<ResponsePayload>;
    deleteContactById(id: string, checkUsage: boolean): Promise<ResponsePayload>;
    deleteMultipleContactById(data: {
        ids: string[];
    }, checkUsage: boolean): Promise<ResponsePayload>;
}
